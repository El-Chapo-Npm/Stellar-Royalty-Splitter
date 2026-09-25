import crypto from "crypto";
import { db, countWrite } from "./core.js";

function clamp(value) {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

export function recordReputationEvent({
  walletAddress,
  eventType,
  successful = true,
  occurredAt,
  metadata = {},
}) {
  const timestamp = occurredAt ?? new Date().toISOString();
  const result = db
    .prepare(
      `
    INSERT INTO reputation_events (walletAddress, eventType, successful, occurredAt, metadata)
    VALUES (?, ?, ?, ?, ?)
  `
    )
    .run(walletAddress, eventType, successful ? 1 : 0, timestamp, JSON.stringify(metadata));
  countWrite();
  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    eventType,
    successful: Boolean(successful),
    occurredAt: timestamp,
    metadata,
  };
}

export function computeTrustScore(walletAddress) {
  const events = db
    .prepare(`SELECT * FROM reputation_events WHERE walletAddress = ? ORDER BY occurredAt ASC`)
    .all(walletAddress);
  const payments = events.filter((event) => event.eventType === "payment");
  const activity = events.filter(
    (event) => event.eventType === "distribution" || event.eventType === "activity"
  );
  const paymentReliability = payments.length
    ? (payments.filter((event) => event.successful).length / payments.length) * 100
    : 0;
  const activePeriods = new Set(activity.map((event) => String(event.occurredAt).slice(0, 7))).size;
  const activityConsistency = Math.min(100, (activePeriods / 12) * 100);
  const trustScore = clamp(paymentReliability * 0.7 + activityConsistency * 0.3);
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO reputation_scores (walletAddress, paymentReliability, activityConsistency, trustScore, totalEvents, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(walletAddress) DO UPDATE SET paymentReliability=excluded.paymentReliability,
      activityConsistency=excluded.activityConsistency, trustScore=excluded.trustScore,
      totalEvents=excluded.totalEvents, updatedAt=excluded.updatedAt
  `
  ).run(
    walletAddress,
    clamp(paymentReliability),
    clamp(activityConsistency),
    trustScore,
    events.length,
    now
  );
  countWrite();
  return {
    walletAddress,
    paymentReliability: clamp(paymentReliability),
    activityConsistency: clamp(activityConsistency),
    trustScore,
    totalEvents: events.length,
    updatedAt: now,
  };
}

export function getReputation(walletAddress) {
  const cached = db
    .prepare("SELECT * FROM reputation_scores WHERE walletAddress = ?")
    .get(walletAddress);
  return cached ?? computeTrustScore(walletAddress);
}

export function listReputations(limit = 50) {
  return db
    .prepare("SELECT * FROM reputation_scores ORDER BY trustScore DESC, updatedAt DESC LIMIT ?")
    .all(limit);
}

export function createReputationVerification(walletAddress, challenge) {
  return crypto.createHash("sha256").update(`${walletAddress}:${challenge}`).digest("hex");
}
