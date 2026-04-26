#![cfg(test)]
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token::{Client as TokenClient, StellarAssetClient},
    vec, Address, Env, IntoVal,
};
use stellar_royalty_splitter::RoyaltySplitterClient;

fn setup(env: &Env) -> (Address, RoyaltySplitterClient) {
    let contract_id = env.register_contract(None, stellar_royalty_splitter::RoyaltySplitter);
    let client = RoyaltySplitterClient::new(env, &contract_id);
    (contract_id, client)
}

fn make_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract(admin.clone())
}

fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    StellarAssetClient::new(env, token).mint(to, &amount);
}

#[test]
#[should_panic(expected = "contract not initialized")]
fn test_distribute_before_initialize_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);
    client.distribute(&token, &10_000_i128);
}

#[test]
#[should_panic(expected = "amount exceeds contract balance")]
fn test_distribute_zero_balance_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);
    client.initialize(&vec![&env, a, b], &vec![&env, 5000_u32, 5000_u32]);
    // contract balance is 0, any positive amount must panic
    client.distribute(&token, &1_i128);
}

/// Issue #92 — pre-loop balance guard prevents partial distribution.
/// 3 collaborators, contract funded with only 300 of the requested 1000.
/// Without the guard the first two transfers would succeed; with it the whole
/// call is rejected before any transfer executes.
#[test]
#[should_panic(expected = "amount exceeds contract balance")]
fn test_no_partial_distribution_on_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let b = Address::generate(&env);
    let c = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);

    client.initialize(
        &vec![&env, admin.clone(), b.clone(), c.clone()],
        &vec![&env, 5000_u32, 3000_u32, 2000_u32],
    );

    // Fund only 300 but request 1000 — guard must fire before any transfer.
    mint(&env, &token, &contract_id, 300);
    client.distribute(&token, &1000_i128);
}

#[test]
#[should_panic(expected = "shares must sum to 10000")]
fn test_royalty_rate_exceeds_max_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    // shares sum to 10001, not 10000
    client.initialize(&vec![&env, a, b], &vec![&env, 5001_u32, 5000_u32]);
}

/// Issue #106 — worst-case dust: last collaborator holds 1 bp (0.01%) and the
/// distribution amount is 9_999 stroops (just under 10_000).
/// Each of the 9_999 preceding collaborators truncates at most 1 stroop, but
/// with only 2 collaborators the dust is at most 1 stroop.
/// Concretely: payout_a = 9_999 * 9_999 / 10_000 = 9_998, dust = 9_999 - 9_998 = 1.
/// The last collaborator's proportional share is 9_999 * 1 / 10_000 = 0 (truncated),
/// so they receive 1 stroop of dust — bounded by (n-1) = 1 stroop.
#[test]
fn test_dust_bounded_for_1bp_last_collaborator() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let last = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);

    // admin = 9999 bp, last = 1 bp
    client.initialize(
        &vec![&env, admin.clone(), last.clone()],
        &vec![&env, 9999_u32, 1_u32],
    );

    let amount: i128 = 9_999;
    mint(&env, &token, &contract_id, amount);
    client.distribute(&token, &amount);

    let admin_payout = TokenClient::new(&env, &token).balance(&admin);
    let last_payout = TokenClient::new(&env, &token).balance(&last);

    // admin gets floor(9999 * 9999 / 10000) = 9998
    assert_eq!(admin_payout, 9_998);
    // last gets remainder = 1 (dust ≤ n-1 = 1 stroop)
    assert_eq!(last_payout, 1);
    // total is conserved
    assert_eq!(admin_payout + last_payout, amount);
}

/// Issue #116 — distribute uses specific mock_auths so the test fails if
/// admin.require_auth() is removed from the contract.
#[test]
fn test_distribute_requires_admin_auth() {
    let env = Env::default();
    let (contract_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let b = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);

    env.mock_all_auths();
    client.initialize(&vec![&env, admin.clone(), b.clone()], &vec![&env, 5000_u32, 5000_u32]);

    let amount: i128 = 1000;
    mint(&env, &token, &contract_id, amount);

    // Use specific mock_auths: only admin is authorised to call distribute.
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "distribute",
            args: (&token, amount).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.distribute(&token, &amount);

    assert_eq!(TokenClient::new(&env, &token).balance(&admin), 500);
    assert_eq!(TokenClient::new(&env, &token).balance(&b), 500);
}

/// TTL — advancing the ledger past MIN_TTL and calling a read function must
/// still succeed because every public function extends the TTL on entry.
#[test]
fn test_ttl_extended_after_ledger_advance() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);

    let a = Address::generate(&env);
    let b = Address::generate(&env);
    client.initialize(&vec![&env, a.clone(), b.clone()], &vec![&env, 6000_u32, 4000_u32]);

    // Advance ledger sequence past MIN_TTL (17_280 ledgers).
    env.ledger().set_sequence_number(env.ledger().sequence() + 17_281);

    // Both read functions must still return correct data (TTL was extended).
    let collaborators = client.get_collaborators();
    assert_eq!(collaborators.len(), 2);
    assert_eq!(client.get_share(&a), 6000);
    assert_eq!(client.get_share(&b), 4000);
}
    let env = Env::default();
    let (contract_id, client) = setup(&env);

    let admin = Address::generate(&env);
    let b = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = make_token(&env, &token_admin);

    env.mock_all_auths();
    client.initialize(&vec![&env, admin.clone(), b.clone()], &vec![&env, 5000_u32, 5000_u32]);

    mint(&env, &token, &contract_id, 1000);

    // No auth mock — require_auth() must reject the call.
    env.mock_auths(&[]);
    client.distribute(&token, &1000_i128);
}

#[test]
#[should_panic(expected = "share cannot be zero")]
fn test_zero_share_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    // b has a zero share — must panic
    client.initialize(&vec![&env, a, b], &vec![&env, 10000_u32, 0_u32]);
}

#[test]
fn test_collaborator_count() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let c = Address::generate(&env);
    client.initialize(
        &vec![&env, a, b, c],
        &vec![&env, 5000_u32, 3000_u32, 2000_u32],
    );
    assert_eq!(client.collaborator_count(), 3);
}

#[test]
#[should_panic]
fn test_unauthorized_init_rejected() {
    let env = Env::default();
    // No mock_all_auths — require_auth() on the admin must reject the call.
    let (_, client) = setup(&env);
    let admin = Address::generate(&env);
    let b = Address::generate(&env);
    client.initialize(&vec![&env, admin, b], &vec![&env, 5000_u32, 5000_u32]);
}