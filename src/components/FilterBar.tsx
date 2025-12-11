import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
  stores: string[];
  reports: string[];
  months: string[];
  macroFamilies: string[];
  selectedStore: string;
  selectedReport: string;
  selectedMonth: string;
  selectedMacroFamily: string;
  onStoreChange: (value: string) => void;
  onReportChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onMacroFamilyChange: (value: string) => void;
}

const FilterBar = ({
  stores,
  reports,
  months,
  macroFamilies,
  selectedStore,
  selectedReport,
  selectedMonth,
  selectedMacroFamily,
  onStoreChange,
  onReportChange,
  onMonthChange,
  onMacroFamilyChange,
}: FilterBarProps) => {
  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Boutique :</label>
          <Select value={selectedStore} onValueChange={onStoreChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner boutique" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store} value={store}>
                  {store}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rapport :</label>
          <Select value={selectedReport} onValueChange={onReportChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner rapport" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => (
                <SelectItem key={report} value={report}>
                  {report}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mois :</label>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner mois" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Macro-Famille :</label>
          <Select value={selectedMacroFamily} onValueChange={onMacroFamilyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner catégorie" />
            </SelectTrigger>
            <SelectContent>
              {macroFamilies.map((family) => (
                <SelectItem key={family} value={family}>
                  {family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
