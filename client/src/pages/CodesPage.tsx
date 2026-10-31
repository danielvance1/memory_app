import SubTabs from "../components/SubTabs";

const tabs = [
  { to: "edit", label: "Edit" },
  { to: "all", label: "All Codes" },
];

// Everything under /codes: setting your codes and looking at them all.
export default function CodesPage() {
  return <SubTabs label="Codes sections" tabs={tabs} />;
}
