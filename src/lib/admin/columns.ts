export interface ColumnDef {
  name: string;
  label: string;
  kind?: "text" | "number" | "badge" | "tags";
}
