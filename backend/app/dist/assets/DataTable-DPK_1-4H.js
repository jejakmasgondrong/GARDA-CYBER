import{c as d,j as e,S as o}from"./index-BTP0WS9E.js";import{E as v}from"./EmptyState-CCfuRcZb.js";/**
 * @license lucide-react v0.447.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=d("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.447.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=d("ArrowUpDown",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-react v0.447.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=d("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);function f({columns:c,data:l,keyExtractor:i,loading:n,emptyTitle:p,emptyDescription:x,onRowClick:s,sortKey:h,sortOrder:m,onSort:t}){return n?e.jsx("div",{className:"rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] overflow-hidden",children:e.jsx("div",{className:"p-4 space-y-3",children:Array.from({length:5}).map((r,a)=>e.jsx(o,{className:"h-10 w-full"},a))})}):l.length===0?e.jsx(v,{title:p||"Tidak ada data",description:x||"Belum ada data untuk ditampilkan."}):e.jsx("div",{className:"rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[var(--gc-card)] overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-[var(--gc-border)]",children:c.map(r=>e.jsx("th",{className:`px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--gc-text-secondary)]
                    ${r.sortable?"cursor-pointer select-none hover:text-[var(--gc-text)]":""} ${r.className||""}`,onClick:()=>r.sortable&&(t==null?void 0:t(r.key)),children:e.jsxs("div",{className:"flex items-center gap-1",children:[r.header,r.sortable&&(h===r.key?m==="asc"?e.jsx(j,{className:"h-3 w-3"}):e.jsx(g,{className:"h-3 w-3"}):e.jsx(b,{className:"h-3 w-3 opacity-40"}))]})},r.key))})}),e.jsx("tbody",{className:"divide-y divide-[var(--gc-border)]",children:l.map(r=>e.jsx("tr",{className:`transition-colors hover:bg-[var(--gc-surface)]/50 ${s?"cursor-pointer":""}`,onClick:()=>s==null?void 0:s(r),children:c.map(a=>e.jsx("td",{className:`px-4 py-3 text-[var(--gc-text)] ${a.className||""}`,children:a.render(r)},a.key))},i(r)))})]})})})}export{f as D};
