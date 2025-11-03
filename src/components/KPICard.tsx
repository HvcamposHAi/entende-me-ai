import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  format?: "number" | "currency" | "percentage";
  subtitle?: string;
}

const KPICard = ({ 
  title, 
  currentValue, 
  previousValue, 
  format = "number",
  subtitle 
}: KPICardProps) => {
  const percentChange = previousValue !== 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 0;
  
  const isPositive = percentChange >= 0;

  const formatValue = (value: number) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat('pt-FR', { 
          style: 'currency', 
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('pt-FR').format(value);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{formatValue(currentValue)}</p>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          <p className="text-sm text-muted-foreground">
            vs. {formatValue(previousValue)} (LY)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
