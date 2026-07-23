// Niche -> badge color mapping, shared between CreateCampaignModal (the
// picker) and ManageCampaigns (rendering real campaigns fetched from
// Supabase). Split into its own file because a component file can only
// export components under the fast-refresh lint rule.
export const NICHE_STYLES = {
  FITNESS: { bg: "#dce1ff", color: "#003cad" },
  FOOD: { bg: "#eaddff", color: "#5a00c6" },
  BEAUTY: { bg: "#ffe4f0", color: "#be185d" },
  LIFESTYLE: { bg: "#e5eeff", color: "#1550d3" },
  TECH: { bg: "#dbeafe", color: "#1e40af" },
  TRAVEL: { bg: "#fef3c7", color: "#92400e" },
};
