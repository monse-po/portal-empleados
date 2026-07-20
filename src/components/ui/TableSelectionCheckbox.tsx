import { TableCheckboxWrap } from "@/src/components/ui/DataTable";

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer accent-navy";

type TableSelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label"?: string;
};

export function TableSelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  "aria-label": ariaLabel,
}: TableSelectionCheckboxProps) {
  return (
    <TableCheckboxWrap>
      <input
        type="checkbox"
        checked={checked}
        aria-label={ariaLabel}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={onChange}
        className={checkboxClass}
      />
    </TableCheckboxWrap>
  );
}
