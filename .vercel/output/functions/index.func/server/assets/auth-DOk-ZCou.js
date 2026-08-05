import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.js";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Compass } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/auth.tsx?tsr-split=component
function AuthPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({ to: "/dashboard" });
		});
	}, [navigate]);
	async function handleEmail(e) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const email = String(fd.get("email"));
		const password = String(fd.get("password"));
		setLoading(true);
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password
			});
			if (error) throw error;
			navigate({ to: "/dashboard" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setLoading(false);
		}
	}
	async function google() {
		setLoading(true);
		try {
			const { error } = await supabase.auth.signInWithOAuth("google", { redirectTo: `${window.location.origin}/auth/callback` });
			if (error) throw error;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Google sign-in failed");
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "min-h-screen aurora-bg grid place-items-center px-4 py-10",
		children: /* @__PURE__ */ jsxs("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ jsxs(Link, {
				to: "/",
				className: "mb-6 flex items-center justify-center gap-2",
				children: [/* @__PURE__ */ jsx("div", {
					className: "grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground",
					children: /* @__PURE__ */ jsx(Compass, { className: "size-5" })
				}), /* @__PURE__ */ jsx("span", {
					className: "font-display text-2xl",
					children: "Trekking Trails Travels"
				})]
			}), /* @__PURE__ */ jsxs(Card, {
				className: "shadow-glow",
				children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsx(CardTitle, {
					className: "font-display text-3xl",
					children: "Workspace"
				}), /* @__PURE__ */ jsx(CardDescription, { children: "Staff portal for Trekking Trails Travels." })] }), /* @__PURE__ */ jsxs(CardContent, { children: [
					/* @__PURE__ */ jsx(Button, {
						onClick: google,
						variant: "outline",
						className: "w-full",
						disabled: loading,
						children: "Continue with Google"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "my-4 flex items-center gap-3 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
							" or ",
							/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: handleEmail,
						className: "space-y-3",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "email",
									children: "Work email"
								}), /* @__PURE__ */ jsx(Input, {
									id: "email",
									name: "email",
									type: "email",
									required: true,
									autoComplete: "email"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "pw",
									children: "Password"
								}), /* @__PURE__ */ jsx(Input, {
									id: "pw",
									name: "password",
									type: "password",
									required: true,
									minLength: 6,
									autoComplete: "current-password"
								})]
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "submit",
								className: "w-full",
								disabled: loading,
								children: "Sign in"
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-4 text-center text-xs text-muted-foreground",
						children: "Need access? Ask an admin to add your account from the Team page."
					})
				] })]
			})]
		})
	});
}
//#endregion
export { AuthPage as component };
