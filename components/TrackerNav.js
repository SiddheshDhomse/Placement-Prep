import Link from "next/link";

export default function TrackerNav({ current }) {
  return (
    <div className="page-switch">
      <Link className={`switch-link${current === "daily" ? " active" : ""}`} href="/">
        Daily Tracker
      </Link>
      <Link className={`switch-link${current === "revision" ? " active" : ""}`} href="/revision">
        Revision Tracker
      </Link>
      <style jsx>{`
        .page-switch {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .switch-link {
          display: inline-flex;
          align-items: center;
          padding: 8px 14px;
          border-radius: 999px;
          border: 0.5px solid #334155;
          background: #1e293b;
          color: #94a3b8;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.15s;
        }
        .switch-link:hover {
          border-color: #6366f1;
          color: #f1f5f9;
        }
        .switch-link.active {
          background: #6366f1;
          border-color: #6366f1;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
