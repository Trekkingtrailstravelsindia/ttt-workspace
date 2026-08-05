import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/settings.tsx?tsr-split=component
function SettingsPage() {
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	async function onSubmit(e) {
		e.preventDefault();
		if (password.length < 6) return toast.error("Password must be at least 6 characters");
		if (password !== confirm) return toast.error("Passwords do not match");
		setLoading(true);
		const { error } = await supabase.auth.updateUser({ password });
		setLoading(false);
		if (error) return toast.error(error.message);
		setPassword("");
		setConfirm("");
		toast.success("Password updated successfully");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
			className: "font-display text-3xl",
			children: "Settings"
		}), /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "Manage your account preferences"
		})] }), /* @__PURE__ */ jsxs(Card, {
			className: "max-w-xl",
			children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(KeyRound, { className: "size-5" }), " Change password"]
			}), /* @__PURE__ */ jsx(CardDescription, { children: "Update the password for your admin account." })] }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", {
				onSubmit,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "new-password",
							children: "New password"
						}), /* @__PURE__ */ jsx(Input, {
							id: "new-password",
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "At least 6 characters",
							autoComplete: "new-password",
							required: true
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "confirm-password",
							children: "Confirm new password"
						}), /* @__PURE__ */ jsx(Input, {
							id: "confirm-password",
							type: "password",
							value: confirm,
							onChange: (e) => setConfirm(e.target.value),
							autoComplete: "new-password",
							required: true
						})]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						disabled: loading,
						children: loading ? "Updating..." : "Update password"
					})
				]
			}) })]
		})]
	});
}
//#endregion
export { SettingsPage as component };
