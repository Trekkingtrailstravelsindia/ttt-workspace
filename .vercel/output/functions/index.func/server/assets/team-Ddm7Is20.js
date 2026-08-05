import { jsx } from "react/jsx-runtime";
//#region src/routes/_authenticated/team.tsx?tsr-split=errorComponent
var SplitErrorComponent = ({ error }) => /* @__PURE__ */ jsx("div", {
	className: "text-sm text-destructive",
	children: error.message
});
//#endregion
export { SplitErrorComponent as errorComponent };
