import { useCallback, useEffect, useState } from "react";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { SearchBox } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import CreateCampaignModal from "../components/CreateCampaignModal";
import { NICHE_STYLES } from "../components/nicheStyles";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";

// Maps the real `campaigns.status` value (lowercase, DB default is "draft")
// to the display label + colors the status pills/badges use.
const STATUS_META = {
  draft: { label: "Draft", statusColor: appColors.grayLight, dotColor: appColors.border },
  active: { label: "Active", statusColor: "#16a34a", dotColor: "#22c55e" },
  reviewing: { label: "Reviewing", statusColor: "#ea580c", dotColor: "#f97316" },
  completed: { label: "Completed", statusColor: appColors.grayLight, dotColor: "#94a3b8" },
};

function formatBudget(campaign) {
  const { budget_min: min, budget_max: max } = campaign;
  if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (max != null) return `$${max.toLocaleString()}`;
  if (min != null) return `$${min.toLocaleString()}`;
  return "—";
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
      <path d="M1 1l5 5 5-5" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v14M1 8h14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
      <circle cx="2" cy="2" r="1.6" fill={appColors.grayLight} />
      <circle cx="8" cy="2" r="1.6" fill={appColors.grayLight} />
      <circle cx="14" cy="2" r="1.6" fill={appColors.grayLight} />
    </svg>
  );
}

function StatCard({ stat }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", flex: 1, minWidth: 0, padding: 25, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: stat.iconBg, borderRadius: 12, width: 44, height: 44 }} />
      <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 32, letterSpacing: -0.8 }}>{stat.value}</span>
      <span style={{ color: appColors.grayLight, fontSize: 13 }}>{stat.label}</span>
    </div>
  );
}

export default function ManageCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [nicheFilter, setNicheFilter] = useState("All");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const statuses = ["All", "Active", "Reviewing", "Draft", "Completed"];
  const niches = ["All", ...new Set(campaigns.map((c) => c.niche))];

  // Applications don't come back embedded on the campaigns row -- fetched
  // separately and tallied client-side per campaign_id, so this doesn't
  // depend on Supabase's relationship-embedding being configured.
  const loadCampaigns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: campaignRows } = await supabase
      .from("campaigns")
      .select("*")
      .eq("brand_id", user.id)
      .order("created_at", { ascending: false });

    const rows = campaignRows ?? [];
    const ids = rows.map((c) => c.id);
    const counts = {};
    if (ids.length > 0) {
      const { data: appRows } = await supabase.from("applications").select("campaign_id").in("campaign_id", ids);
      (appRows ?? []).forEach((a) => {
        counts[a.campaign_id] = (counts[a.campaign_id] || 0) + 1;
      });
    }

    setCampaigns(rows.map((c) => ({ ...c, appsCount: counts[c.id] || 0 })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Fetch-on-mount/user-change -- the standard valid use of an effect;
    // loadCampaigns is also reused directly by the mutation handlers below
    // to refresh after a create/duplicate/delete.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCampaigns();
  }, [loadCampaigns]);

  const filtered = campaigns
    .filter((c) => statusFilter === "All" || (STATUS_META[c.status]?.label ?? c.status) === statusFilter)
    .filter((c) => nicheFilter === "All" || c.niche === nicheFilter);

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const completedCount = campaigns.filter((c) => c.status === "completed").length;
  const totalApplications = campaigns.reduce((sum, c) => sum + c.appsCount, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget_max ?? c.budget_min ?? 0), 0);
  const stats = [
    { value: String(activeCount), label: "Active Campaigns", iconBg: "#dce1ff" },
    { value: `$${totalBudget.toLocaleString()}`, label: "Total Budget Allocated", iconBg: "#eaddff" },
    { value: String(totalApplications), label: "Total Applications", iconBg: "#ffdcc6" },
    { value: String(completedCount), label: "Completed Campaigns", iconBg: appColors.primaryLight },
  ];

  // Returns { error } (Supabase's own convention) so the modal can show its
  // own error message and only close once the insert actually succeeds.
  const handleCreateCampaign = async (form) => {
    const { error } = await supabase.from("campaigns").insert({
      brand_id: user.id,
      name: form.name,
      niche: form.niche,
      budget_min: form.budgetMin,
      budget_max: form.budgetMax,
      platforms: form.platforms,
      deadline: form.deadline,
      brief: form.brief,
      status: "draft",
    });
    if (!error) await loadCampaigns();
    return { error };
  };

  const handleDelete = async (id) => {
    setOpenMenuId(null);
    await supabase.from("campaigns").delete().eq("id", id);
    await loadCampaigns();
  };

  const handleDuplicate = async (campaign) => {
    setOpenMenuId(null);
    await supabase.from("campaigns").insert({
      brand_id: user.id,
      name: `${campaign.name} (Copy)`,
      niche: campaign.niche,
      budget_min: campaign.budget_min,
      budget_max: campaign.budget_max,
      platforms: campaign.platforms,
      deadline: campaign.deadline,
      brief: campaign.brief,
      status: "draft",
    });
    await loadCampaigns();
  };

  return (
    <div
      className="kollab-manage-campaigns"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-manage-campaigns, .kollab-manage-campaigns *, .kollab-manage-campaigns *::before, .kollab-manage-campaigns *::after {
          box-sizing: border-box;
        }
        .kollab-scroll-row {
          scrollbar-width: thin;
          scrollbar-color: ${appColors.border} transparent;
        }
        .kollab-scroll-row::-webkit-scrollbar { height: 6px; }
        .kollab-scroll-row::-webkit-scrollbar-thumb { background: ${appColors.border}; border-radius: 9999px; }
        .kollab-scroll-row::-webkit-scrollbar-track { background: transparent; }
        @media (max-width: 768px) {
          .kollab-manage-campaigns-main {
            margin-left: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-manage-campaigns-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .kollab-manage-campaigns-stats {
            flex-direction: column !important;
          }
        }
      `}</style>

      <AppSidebar activeItem="campaigns" />
      <AppTopBar left={<SearchBox placeholder="Search your campaigns..." />} />

      <main className="kollab-manage-campaigns-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32, display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="kollab-manage-campaigns-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h1 style={{ fontWeight: 600, color: appColors.navy, fontSize: 36, letterSpacing: -0.72, margin: 0 }}>Manage Campaigns</h1>
            <p style={{ color: appColors.grayLight, fontSize: 16, margin: 0 }}>Create, track, and manage all of your brand's campaigns in one place.</p>
          </div>
          <button type="button" onClick={() => setCreateModalOpen(true)} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "14px 24px", display: "flex", gap: 8, alignItems: "center", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer", boxShadow: "0px 10px 15px -3px rgba(21,80,211,0.2), 0px 4px 6px -4px rgba(21,80,211,0.2)" }}>
            <PlusIcon /> Create Campaign
          </button>
        </div>

        <div className="kollab-manage-campaigns-stats" style={{ display: "flex", gap: 24 }}>
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", overflow: "hidden" }}>
          <div style={{ borderBottom: `1px solid ${appColors.border}`, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div className="kollab-scroll-row" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  style={{
                    background: statusFilter === s ? appColors.primary : "white",
                    border: `1px solid ${statusFilter === s ? appColors.primary : appColors.border}`,
                    borderRadius: 9999, padding: "8px 16px", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap",
                    color: statusFilter === s ? "white" : appColors.gray, cursor: "pointer",
                    transition: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ color: appColors.gray, fontSize: 13, fontWeight: 600 }}>Niche:</span>
              <select
                value={nicheFilter}
                onChange={(e) => setNicheFilter(e.target.value)}
                style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: appColors.gray, cursor: "pointer" }}
              >
                {niches.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kollab-scroll-row" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: appColors.primaryLighter, borderBottom: `1px solid ${appColors.border}` }}>
                  {["CAMPAIGN NAME", "NICHE", "BUDGET", "APPLICATIONS", "STATUS", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "16px 24px", color: appColors.grayLight, fontSize: 12, fontWeight: 700, letterSpacing: 0.24, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.map((c) => {
                  const meta = STATUS_META[c.status] ?? STATUS_META.draft;
                  const nicheStyle = NICHE_STYLES[c.niche] ?? { bg: appColors.primaryLight, color: appColors.primary };
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${appColors.border}` }}>
                      <td style={{ padding: "20px 24px", fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{c.name}</td>
                      <td style={{ padding: "20px 24px" }}>
                        <span style={{ background: nicheStyle.bg, color: nicheStyle.color, fontWeight: 700, fontSize: 10, borderRadius: 9999, padding: "2.5px 12px", textTransform: "uppercase" }}>{c.niche}</span>
                      </td>
                      <td style={{ padding: "20px 24px", color: appColors.navy, fontSize: 16 }}>{formatBudget(c)}</td>
                      <td style={{ padding: "20px 24px", color: appColors.navy, fontSize: 14 }}>{c.appsCount > 0 ? `+${c.appsCount}` : "—"}</td>
                      <td style={{ padding: "20px 24px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: meta.statusColor, fontWeight: 700, fontSize: 14 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 9999, background: meta.dotColor }} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: "20px 24px", position: "relative" }}>
                        <button type="button" aria-label="More actions" onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
                          <DotsIcon />
                        </button>
                        {openMenuId === c.id && (
                          <>
                            <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
                            <div style={{ position: "absolute", right: 24, top: "100%", background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, boxShadow: "0px 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 20, minWidth: 140, overflow: "hidden" }}>
                              <button type="button" onClick={() => handleDuplicate(c)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 16px", fontSize: 13, color: appColors.navy, cursor: "pointer" }}>
                                Duplicate
                              </button>
                              <button type="button" onClick={() => handleDelete(c.id)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 16px", fontSize: 13, color: "#ba1a1a", cursor: "pointer" }}>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                      Loading campaigns…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                      No campaigns match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {createModalOpen && <CreateCampaignModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreateCampaign} />}
    </div>
  );
}