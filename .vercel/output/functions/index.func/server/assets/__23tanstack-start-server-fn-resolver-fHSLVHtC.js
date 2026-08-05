//#region \0%23tanstack-start-server-fn-resolver
var manifest = {
	"128b2ec2c3172ddeca02bd88ad6bf21b284f17a70e914a6c66e9953e3b5c052a": {
		functionName: "listTeam_createServerFn_handler",
		importer: () => import("./team.functions-itld-ApE.js")
	},
	"407ce10db9009b4a0a4b5159dd2d1c7f7dff23ceab11663cfdeb19d85423ac50": {
		functionName: "deleteTeamMember_createServerFn_handler",
		importer: () => import("./team.functions-itld-ApE.js")
	},
	"a1f42dccdf6dc0bcf278ae78dd1cf4bd14d4b485c3ba021ccddd7937782beb91": {
		functionName: "setTeamMemberRole_createServerFn_handler",
		importer: () => import("./team.functions-itld-ApE.js")
	},
	"bba7b45680920c73a681c1a7ef18cd8f1e19a47f0d46cd7933ba80deebb8831b": {
		functionName: "createTeamMember_createServerFn_handler",
		importer: () => import("./team.functions-itld-ApE.js")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
