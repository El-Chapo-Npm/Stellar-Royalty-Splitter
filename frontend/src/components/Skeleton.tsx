import "./Skeleton.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle,
  className = "",
}) => {
  const style = {
    width,
    height,
    borderRadius: circle ? "50%" : "8px",
  };

  return <div className={`skeleton-loader ${className}`} style={style}></div>;
};

export const DashboardSkeleton = () => {
  return (
    <div className="dashboard-skeleton">
      <div className="kpi-cards-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card-skeleton">
            <Skeleton width="60%" height="1rem" className="mb-2" />
            <Skeleton width="80%" height="2rem" />
          </div>
        ))}
      </div>
      <div className="charts-skeleton">
        <div className="chart-skeleton">
          <Skeleton width="40%" height="1.5rem" className="mb-4" />
          <Skeleton width="100%" height="300px" />
        </div>
        <div className="chart-skeleton">
          <Skeleton width="40%" height="1.5rem" className="mb-4" />
          <Skeleton width="100%" height="300px" />
        </div>
      </div>
    </div>
  );
};
