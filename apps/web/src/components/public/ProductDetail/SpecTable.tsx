interface SpecRow {
  name: string;
  value: string;
  unit?: string | null;
}

interface SpecTableProps {
  specs: SpecRow[];
}

export function SpecTable({ specs }: SpecTableProps) {
  if (specs.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {specs.map((spec, index) => (
            <tr
              key={spec.name}
              className={`border-b last:border-b-0 ${
                index % 2 === 0 ? "bg-muted/30" : "bg-background"
              }`}
            >
              <td className="py-3 px-4 font-medium text-foreground w-1/3">
                {spec.name}
              </td>
              <td className="py-3 px-4 text-foreground">
                {spec.value || "—"}
                {spec.value && spec.unit && (
                  <span className="text-muted-foreground ml-1">{spec.unit}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
