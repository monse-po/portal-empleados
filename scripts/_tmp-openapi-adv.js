const fs = require("fs");
const o = JSON.parse(
  fs.readFileSync(
    "/Users/imeldaalonso/dev/portal-empleados/docs/ifs/CEmpAdvanceHandling.openapi.json",
    "utf8",
  ),
);
const paths = Object.keys(o.paths);
console.log(paths.join("\n"));
const keys = [
  paths.find((k) => k.endsWith("CEmpAdvances_SetApproved")),
  paths.find((k) => k.endsWith("CEmpAdvances_Approve")),
  paths.find((k) => k.endsWith("CEmpAdvances_SetReject")),
  paths.find((k) => /CEmpAdvanceQuerySet$/.test(k)),
];
for (const k of keys) {
  console.log("\n====", k);
  console.log(JSON.stringify(o.paths[k], null, 2).slice(0, 3500));
}
const schemas = Object.keys(o.components?.schemas || {}).filter((k) =>
  /Query|SetApproved|Approve|SetReject/i.test(k),
);
console.log("\n==== SCHEMAS", schemas);
for (const s of schemas) {
  const sch = o.components.schemas[s];
  console.log(
    "\nSCHEMA",
    s,
    "req",
    sch.required,
    "props",
    Object.keys(sch.properties || {}),
  );
}
