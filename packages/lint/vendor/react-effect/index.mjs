//#region src/util/ast.ts
const ascend = (context, ref, visit, visited = /* @__PURE__ */ new Set()) => {
	var _ref$resolved;
	if (visited.has(ref)) return;
	const cont = visit(ref);
	visited.add(ref);
	if (cont === false) return;
	(_ref$resolved = ref.resolved) === null || _ref$resolved === void 0 || _ref$resolved.defs.filter((def) => def.type !== "ImportBinding").filter((def) => def.type !== "Parameter").map((def) => def.node.init ?? def.node.body).filter((n) => Boolean(n)).flatMap((node) => getDownstreamRefs(context, node)).forEach((ref) => ascend(context, ref, visit, visited));
};
const descend = (context, node, visit, visited = /* @__PURE__ */ new Set()) => {
	if (visited.has(node)) return;
	visit(node);
	visited.add(node);
	(context.sourceCode.visitorKeys[node.type] || []).filter((key) => key !== "arguments").map((key) => node[key]).filter(Boolean).flatMap((child) => Array.isArray(child) ? child : [child]).filter(Boolean).forEach((child) => descend(context, child, visit, visited));
};
const getUpstreamRefs = (context, ref) => {
	const refs = [];
	ascend(context, ref, (upRef) => {
		refs.push(upRef);
	});
	return refs;
};
const findDownstreamNodes = (context, topNode, type) => {
	const nodes = [];
	descend(context, topNode, (node) => {
		if (node.type === type) nodes.push(node);
	});
	return nodes;
};
const getDownstreamRefs = (context, node) => findDownstreamNodes(context, node, "Identifier").map((identifier) => getRef(context, identifier)).filter(Boolean);
const getCallExpr = (ref, current = ref.identifier.parent) => {
	if (current.type === "CallExpression") {
		let node = ref.identifier;
		while (node.parent.type === "MemberExpression") node = node.parent;
		if (current.callee === node) return current;
	}
	if (current.type === "MemberExpression") return getCallExpr(ref, current.parent);
};
const getArgsUpstreamRefs = (context, ref) => getUpstreamRefs(context, ref).map((ref) => getCallExpr(ref)).filter(Boolean).flatMap((callExpr) => {
	if (!callExpr || callExpr.type !== "CallExpression") return [];
	return callExpr.arguments;
}).flatMap((arg) => getDownstreamRefs(context, arg)).flatMap((ref) => getUpstreamRefs(context, ref));
const getRef = (context, identifier) => {
	var _context$sourceCode$g;
	return (_context$sourceCode$g = context.sourceCode.getScope(identifier)) === null || _context$sourceCode$g === void 0 ? void 0 : _context$sourceCode$g.references.find((ref) => ref.identifier == identifier);
};
const isSynchronous = (node, within) => {
	if (node === within) return true;
	else if (node.type === "AwaitExpression" || node.type === "UnaryExpression" && node.operator === "void" || node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") return false;
	else return isSynchronous(node.parent, within);
};
const getSynchronousCallChain = (context, ref) => {
	const findEnclosingFunction = (node) => {
		if (!node) return;
		else if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") return node;
		else return findEnclosingFunction(node.parent);
	};
	const isAliasRef = (ref) => {
		const containerParents = [
			"Property",
			"ObjectExpression",
			"ArrayExpression",
			"SequenceExpression"
		];
		let node = ref.identifier;
		for (;;) {
			const parent = node.parent;
			if (parent.type === "VariableDeclarator" && parent.init === node) return true;
			if (containerParents.includes(parent.type)) {
				node = parent;
				continue;
			}
			return false;
		}
	};
	const callExprRefs = [];
	ascend(context, ref, (upRef) => {
		const callExpr = getCallExpr(upRef);
		const enclosingFn = findEnclosingFunction(callExpr);
		if (callExpr && enclosingFn && isSynchronous(callExpr, enclosingFn)) callExprRefs.push(upRef);
		else if (isAliasRef(upRef)) callExprRefs.push(upRef);
		else return false;
	});
	return callExprRefs;
};
//#endregion
//#region src/util/react.ts
const isFunctionalComponent = (node) => {
	var _node$init, _node$init2, _node$id;
	return (node.type === "FunctionDeclaration" || node.type === "VariableDeclarator" && (((_node$init = node.init) === null || _node$init === void 0 ? void 0 : _node$init.type) === "ArrowFunctionExpression" || ((_node$init2 = node.init) === null || _node$init2 === void 0 ? void 0 : _node$init2.type) === "CallExpression")) && ((_node$id = node.id) === null || _node$id === void 0 ? void 0 : _node$id.type) === "Identifier" && node.id.name[0].toUpperCase() === node.id.name[0];
};
const isFunctionalHOC = (context, node) => {
	const knownPureHocs = ["memo", "forwardRef"];
	const isWrappedInline = (n) => {
		var _n$init;
		return n.type === "VariableDeclarator" && ((_n$init = n.init) === null || _n$init === void 0 ? void 0 : _n$init.type) === "CallExpression" && n.init.callee.type === "Identifier" && !knownPureHocs.includes(n.init.callee.name) && n.init.arguments.length > 0 && (n.init.arguments[0].type === "ArrowFunctionExpression" || n.init.arguments[0].type === "FunctionExpression");
	};
	const isWrappedSeparately = (n) => {
		var _getRef;
		return ((_getRef = getRef(context, n.id)) === null || _getRef === void 0 || (_getRef = _getRef.resolved) === null || _getRef === void 0 ? void 0 : _getRef.references.filter((ref) => {
			const parent = ref.identifier.parent;
			return (parent === null || parent === void 0 ? void 0 : parent.type) === "CallExpression" && parent.arguments.includes(ref.identifier);
		}).map((ref) => ref.identifier.parent).some((wrapper) => wrapper.type === "CallExpression" && wrapper.callee.type === "Identifier" && !knownPureHocs.includes(wrapper.callee.name))) ?? false;
	};
	return isFunctionalComponent(node) && (isWrappedInline(node) || isWrappedSeparately(node));
};
const isCustomHook = (node) => {
	var _node$id2;
	if (node.type !== "FunctionDeclaration" && (node.type !== "VariableDeclarator" || !node.init || node.init.type !== "ArrowFunctionExpression" && node.init.type !== "FunctionExpression")) return false;
	return ((_node$id2 = node.id) === null || _node$id2 === void 0 ? void 0 : _node$id2.type) === "Identifier" && node.id.name.startsWith("use") && node.id.name.length > 3 && node.id.name[3] !== void 0 && node.id.name[3] === node.id.name[3].toUpperCase();
};
const isUseState = (node) => {
	if (node.type === "Identifier" && node.name === "useState") return true;
	if (node.type === "MemberExpression" && node.object.type === "Identifier" && node.object.name === "React" && node.property.type === "Identifier" && node.property.name === "useState") return true;
	const parent = node.parent;
	return parent.type === "MemberExpression" && parent.object.type === "Identifier" && parent.object.name === "React" && parent.property.type === "Identifier" && parent.property.name === "useState";
};
const isUseRef = (node) => {
	if (node.type === "Identifier" && node.name === "useRef") return true;
	const parent = node.parent;
	return parent.type === "MemberExpression" && parent.object.type === "Identifier" && parent.object.name === "React" && parent.property.type === "Identifier" && parent.property.name === "useRef";
};
const isUseEffect = (node) => node.type === "CallExpression" && (node.callee.type === "Identifier" && node.callee.name === "useEffect" || node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" && node.callee.object.name === "React" && node.callee.property.type === "Identifier" && node.callee.property.name === "useEffect");
const getEffectFn = (context, node) => {
	if (node.type !== "CallExpression") return void 0;
	const effectFn = node.arguments[0];
	if ((effectFn === null || effectFn === void 0 ? void 0 : effectFn.type) === "ArrowFunctionExpression" || (effectFn === null || effectFn === void 0 ? void 0 : effectFn.type) === "FunctionExpression") return effectFn;
	else if ((effectFn === null || effectFn === void 0 ? void 0 : effectFn.type) === "Identifier") {
		var _ref$resolved;
		const ref = getRef(context, effectFn);
		const def = ref === null || ref === void 0 || (_ref$resolved = ref.resolved) === null || _ref$resolved === void 0 ? void 0 : _ref$resolved.defs[0];
		if (!def) return void 0;
		return def.node.init ?? def.node.body;
	}
};
const getEffectDeps = (node) => {
	if (node.type !== "CallExpression") return void 0;
	const depsArr = node.arguments[1];
	if ((depsArr === null || depsArr === void 0 ? void 0 : depsArr.type) !== "ArrayExpression") return;
	return depsArr;
};
const getEffectCleanup = (context, node) => {
	const effectFn = getEffectFn(context, node);
	if (!effectFn) return void 0;
	if (effectFn.type !== "ArrowFunctionExpression" && effectFn.type !== "FunctionExpression" || effectFn.body.type !== "BlockStatement") return;
	return effectFn.body.body.concat().reverse().find((stmt) => stmt.type === "ReturnStatement" && stmt.argument);
};
const getEffect = (context, node) => {
	if (!isUseEffect(node)) return void 0;
	const fn = getEffectFn(context, node);
	if (!fn) return void 0;
	const deps = getEffectDeps(node);
	return {
		fn,
		fnRefs: getDownstreamRefs(context, fn),
		depsRefs: deps ? getDownstreamRefs(context, deps) : void 0,
		cleanup: getEffectCleanup(context, node)
	};
};
const isState = (ref) => {
	var _ref$resolved2;
	return ((_ref$resolved2 = ref.resolved) === null || _ref$resolved2 === void 0 ? void 0 : _ref$resolved2.defs.some((def) => {
		var _def$node$init, _def$node$id$elements;
		return def.node.type === "VariableDeclarator" && ((_def$node$init = def.node.init) === null || _def$node$init === void 0 ? void 0 : _def$node$init.type) === "CallExpression" && isUseState(def.node.init.callee) && def.node.id.type === "ArrayPattern" && (def.node.id.elements.length === 1 || def.node.id.elements.length === 2) && ((_def$node$id$elements = def.node.id.elements[0]) === null || _def$node$id$elements === void 0 ? void 0 : _def$node$id$elements.type) === "Identifier" && def.node.id.elements[0].name === ref.identifier.name;
	})) ?? false;
};
const isStateSetter = (ref) => {
	var _ref$resolved3;
	return ((_ref$resolved3 = ref.resolved) === null || _ref$resolved3 === void 0 ? void 0 : _ref$resolved3.defs.some((def) => {
		var _def$node$init2, _def$node$id$elements2;
		return def.node.type === "VariableDeclarator" && ((_def$node$init2 = def.node.init) === null || _def$node$init2 === void 0 ? void 0 : _def$node$init2.type) === "CallExpression" && isUseState(def.node.init.callee) && def.node.id.type === "ArrayPattern" && def.node.id.elements.length === 2 && ((_def$node$id$elements2 = def.node.id.elements[1]) === null || _def$node$id$elements2 === void 0 ? void 0 : _def$node$id$elements2.type) === "Identifier" && def.node.id.elements[1].name === ref.identifier.name;
	})) ?? false;
};
const isProp = (context, ref) => {
	var _ref$resolved4;
	return ((_ref$resolved4 = ref.resolved) === null || _ref$resolved4 === void 0 ? void 0 : _ref$resolved4.defs.some((def) => {
		const declaringNode = def.node.type === "ArrowFunctionExpression" ? def.node.parent.type === "CallExpression" ? def.node.parent.parent : def.node.parent : def.node;
		return def.type === "Parameter" && (isFunctionalComponent(declaringNode) && !isFunctionalHOC(context, declaringNode) || isCustomHook(declaringNode));
	})) ?? false;
};
const isConstant = (ref) => {
	var _ref$resolved5;
	return (((_ref$resolved5 = ref.resolved) === null || _ref$resolved5 === void 0 ? void 0 : _ref$resolved5.defs) ?? []).some((def) => {
		var _def$node$init3, _def$node$init4, _def$node$init5, _def$node$init6;
		return def.node.type === "VariableDeclarator" && ((_def$node$init3 = def.node.init) === null || _def$node$init3 === void 0 ? void 0 : _def$node$init3.type) === "Literal" || ((_def$node$init4 = def.node.init) === null || _def$node$init4 === void 0 ? void 0 : _def$node$init4.type) === "TemplateLiteral" || ((_def$node$init5 = def.node.init) === null || _def$node$init5 === void 0 ? void 0 : _def$node$init5.type) === "ArrayExpression" || ((_def$node$init6 = def.node.init) === null || _def$node$init6 === void 0 ? void 0 : _def$node$init6.type) === "ObjectExpression";
	});
};
const isRef = (ref) => {
	var _ref$resolved6;
	return ((_ref$resolved6 = ref.resolved) === null || _ref$resolved6 === void 0 ? void 0 : _ref$resolved6.defs.some((def) => {
		var _def$node$init7;
		return def.node.type === "VariableDeclarator" && ((_def$node$init7 = def.node.init) === null || _def$node$init7 === void 0 ? void 0 : _def$node$init7.type) === "CallExpression" && (def.node.init.callee.type === "Identifier" && def.node.init.callee.name === "useRef" || def.node.init.callee.type === "MemberExpression" && def.node.init.callee.object.type === "Identifier" && def.node.init.callee.object.name === "React" && def.node.init.callee.property.type === "Identifier" && def.node.init.callee.property.name === "useRef");
	})) ?? false;
};
const isRefCurrent = (ref) => {
	const parent = ref.identifier.parent;
	return parent.type === "MemberExpression" && parent.property.type === "Identifier" && parent.property.name === "current";
};
const isStateCall = (context, ref) => getSynchronousCallChain(context, ref).some((callChainRef) => isStateSetter(callChainRef));
const isPropCall = (context, ref) => getSynchronousCallChain(context, ref).some((callChainRef) => isProp(context, callChainRef));
const isRefCall = (context, ref) => getSynchronousCallChain(context, ref).some((callChainRef) => isRefCurrent(callChainRef) || isRef(callChainRef));
const getStateName = (context, ref) => {
	var _ref;
	const decl = getUseStateDecl(context, ref);
	if (!decl || decl.id.type !== "ArrayPattern") return void 0;
	const elements = decl.id.elements;
	const first = elements[0];
	const second = elements[1];
	return (_ref = ((first === null || first === void 0 ? void 0 : first.type) === "Identifier" ? first : void 0) ?? ((second === null || second === void 0 ? void 0 : second.type) === "Identifier" ? second : void 0)) === null || _ref === void 0 ? void 0 : _ref.name;
};
const getUseStateDecl = (context, ref) => {
	var _getUpstreamRefs$find;
	let result = (_getUpstreamRefs$find = getUpstreamRefs(context, ref).find((upRef) => isUseState(upRef.identifier))) === null || _getUpstreamRefs$find === void 0 ? void 0 : _getUpstreamRefs$find.identifier;
	while (result && result.type !== "VariableDeclarator") result = result.parent;
	return result;
};
const findEnclosingReactNode = (context, node) => {
	if (!node) return;
	else if (isFunctionalComponent(node) || isFunctionalHOC(context, node) || isCustomHook(node)) return node;
	else return findEnclosingReactNode(context, node.parent);
};
const getComponentName = (containingNode) => {
	var _id;
	if (!containingNode) return void 0;
	if (containingNode.type !== "FunctionDeclaration" && containingNode.type !== "VariableDeclarator") return void 0;
	return (_id = containingNode.id) === null || _id === void 0 ? void 0 : _id.name;
};
//#endregion
//#region src/rules/no-adjust-state-on-prop-change.ts
const rule$8 = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow adjusting state in an effect when a prop changes.",
			url: "https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes"
		},
		schema: [],
		messages: { avoidAdjustingStateWhenAPropChanges: "Avoid adjusting state when a prop changes. Instead, adjust \"{{state}}\" directly during render when {{props}} changes, or refactor your state to avoid this need entirely." }
	},
	create: (context) => ({ CallExpression: (node) => {
		const effect = getEffect(context, node);
		if (!effect || !effect.depsRefs) return;
		const depsPropRefs = effect.depsRefs.flatMap((ref) => getUpstreamRefs(context, ref)).filter((ref) => isProp(context, ref));
		if (depsPropRefs.length === 0) return;
		effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isStateCall(context, ref)).forEach((ref) => {
			const callExpr = getCallExpr(ref);
			if (!callExpr) return;
			if (getArgsUpstreamRefs(context, ref).some((ref) => isProp(context, ref))) return;
			const stateName = getStateName(context, ref);
			if (!stateName) return;
			context.report({
				node: callExpr,
				messageId: "avoidAdjustingStateWhenAPropChanges",
				data: {
					state: stateName,
					props: depsPropRefs.map((ref) => ref.identifier.name).map((n) => `"${n}"`).join(" and ")
				}
			});
		});
	} })
};
//#endregion
//#region src/rules/no-reset-all-state-on-prop-change.ts
const rule$7 = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow resetting all state in an effect when a prop changes.",
			url: "https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes"
		},
		schema: [],
		messages: { avoidResettingAllStateWhenAPropChanges: "Avoid resetting all state when a prop changes. Instead, if \"{{prop}}\" is a key, pass it as \"key\" so React will reset the component's state." }
	},
	create: (context) => ({ CallExpression: (node) => {
		const effect = getEffect(context, node);
		if (!effect || !effect.depsRefs) return;
		const containingNode = findEnclosingReactNode(context, node);
		if (containingNode && isCustomHook(containingNode)) return;
		const propUsedToResetAllState = findPropUsedToResetAllState(context, effect.fnRefs, effect.depsRefs, node);
		if (propUsedToResetAllState) context.report({
			node,
			messageId: "avoidResettingAllStateWhenAPropChanges",
			data: { prop: propUsedToResetAllState.identifier.name }
		});
	} })
};
const findPropUsedToResetAllState = (context, effectFnRefs, depsRefs, useEffectNode) => {
	const stateSetterRefs = effectFnRefs.filter((ref) => isStateCall(context, ref));
	return stateSetterRefs.length > 0 && stateSetterRefs.every((ref) => isSetStateToInitialValue(context, ref)) && stateSetterRefs.length === countUseStates(context, findEnclosingReactNode(context, useEffectNode)) ? depsRefs.flatMap((ref) => getUpstreamRefs(context, ref)).find((ref) => isProp(context, ref)) : void 0;
};
const isSetStateToInitialValue = (context, setterRef) => {
	const callExpr = getCallExpr(setterRef);
	if (!callExpr || callExpr.type !== "CallExpression") return false;
	const setStateToValue = callExpr.arguments[0];
	const useStateDecl = getUseStateDecl(context, setterRef);
	if (!useStateDecl || !useStateDecl.init || useStateDecl.init.type !== "CallExpression") return false;
	const stateInitialValue = useStateDecl.init.arguments[0];
	const isUndefined = (node) => node === void 0 || "name" in node && node.name === "undefined";
	if (isUndefined(setStateToValue) && isUndefined(stateInitialValue)) return true;
	if (setStateToValue === null && stateInitialValue === null) return true;
	else if (setStateToValue && !stateInitialValue || !setStateToValue && stateInitialValue) return false;
	if (!setStateToValue || !stateInitialValue) return false;
	return context.sourceCode.getText(setStateToValue) === context.sourceCode.getText(stateInitialValue);
};
const countUseStates = (context, componentNode) => {
	var _componentNode$init;
	if (!componentNode) return 0;
	if (componentNode.type === "VariableDeclarator" && ((_componentNode$init = componentNode.init) === null || _componentNode$init === void 0 ? void 0 : _componentNode$init.type) === "CallExpression") componentNode = componentNode.init.arguments[0];
	return getDownstreamRefs(context, componentNode).filter((ref) => isState(ref)).length;
};
//#endregion
//#region src/index.ts
const plugin = {
	meta: {
		name: "react-you-might-not-need-an-effect",
		version: "1.0.2"
	},
	rules: {
		"no-derived-state": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow storing derived state in an effect.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state"
				},
				schema: [],
				messages: { avoidDerivedState: "Avoid storing derived state. Instead, compute \"{{state}}\" directly during render." }
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || effect.cleanup) return;
				effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isStateCall(context, ref)).forEach((ref) => {
					const callExpr = getCallExpr(ref);
					if (!callExpr) return;
					const stateName = getStateName(context, ref);
					if (!stateName) return;
					if (getArgsUpstreamRefs(context, ref).some((ref) => isState(ref) || isProp(context, ref))) context.report({
						node: callExpr,
						messageId: "avoidDerivedState",
						data: { state: stateName }
					});
				});
			} })
		},
		"no-chain-state-updates": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow chaining state changes in an effect.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations"
				},
				schema: [],
				messages: { avoidChainingStateUpdates: "Avoid chaining state changes. When possible, update \"{{state}}\" along with other relevant state simultaneously." }
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || effect.cleanup || !effect.depsRefs) return;
				const isSomeDepsState = effect.depsRefs.flatMap((ref) => getUpstreamRefs(context, ref)).some((ref) => isState(ref));
				effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isStateCall(context, ref)).forEach((ref) => {
					const callExpr = getCallExpr(ref);
					if (!callExpr) return;
					const isSomeArgsState = getArgsUpstreamRefs(context, ref).some((ref) => isState(ref));
					if (isSomeDepsState && !isSomeArgsState) {
						const stateName = getStateName(context, ref);
						if (!stateName) return;
						context.report({
							node: callExpr,
							messageId: "avoidChainingStateUpdates",
							data: { state: stateName }
						});
					}
				});
			} })
		},
		"no-event-handler": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow using state and an effect as an event handler.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#sharing-logic-between-event-handlers"
				},
				schema: [],
				messages: {
					avoidEventHandler: "Avoid using state and effects as an event handler. Instead, call the code that uses \"{{name}}\" directly when the event occurs.",
					avoidPropHandler: "Avoid using props and effects as an event handler. Instead, move the code that uses \"{{name}}\" to the parent component."
				}
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || effect.cleanup) return;
				findDownstreamNodes(context, effect.fn, "IfStatement").filter((ifNode) => ifNode.type === "IfStatement" && !ifNode.alternate).map((ifNode) => ifNode.test).flatMap((ifTestNode) => getDownstreamRefs(context, ifTestNode)).forEach((ifTestRef) => {
					const upstreamRefs = getUpstreamRefs(context, ifTestRef);
					const name = ifTestRef.identifier.name;
					if (upstreamRefs.some((ref) => isState(ref))) context.report({
						node: ifTestRef.identifier,
						messageId: "avoidEventHandler",
						data: { name }
					});
					if (upstreamRefs.some((ref) => isProp(context, ref))) context.report({
						node: ifTestRef.identifier,
						messageId: "avoidPropHandler",
						data: { name }
					});
				});
			} })
		},
		"no-adjust-state-on-prop-change": rule$8,
		"no-reset-all-state-on-prop-change": rule$7,
		"no-pass-live-state-to-parent": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow passing live state to parents in an effect.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#notifying-parent-components-about-state-changes"
				},
				schema: [],
				messages: {
					avoidPassingLiveStateToParentInComponent: "Avoid passing live state to parents in an effect. Instead, lift \"{{state}}\" to the parent and pass it down to {{name}} as a prop.",
					avoidPassingLiveStateToParentInHook: "Avoid passing live state to parents in an effect. Instead, return \"{{state}}\" from {{name}}."
				}
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect) return;
				effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isPropCall(context, ref)).forEach((ref) => {
					const callExpr = getCallExpr(ref);
					if (!callExpr) return;
					const stateRefs = getArgsUpstreamRefs(context, ref).filter((r) => isState(r));
					if (stateRefs.length === 0) return;
					const containingNode = findEnclosingReactNode(context, node);
					const isInCustomHook = containingNode && isCustomHook(containingNode);
					context.report({
						node: callExpr,
						messageId: isInCustomHook ? "avoidPassingLiveStateToParentInHook" : "avoidPassingLiveStateToParentInComponent",
						data: {
							state: stateRefs.map((r) => r.identifier.name).map((n) => `"${n}"`).join(" and "),
							name: (() => {
								const n = getComponentName(containingNode);
								return n ? `"${n}"` : isInCustomHook ? "this custom hook" : "this component";
							})()
						}
					});
				});
			} })
		},
		"no-pass-data-to-parent": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow passing data to parents in an effect.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#passing-data-to-the-parent"
				},
				schema: [],
				messages: {
					avoidPassingDataToParentInComponent: "Avoid passing data to parents in an effect. Instead, fetch \"{{data}}\" in the parent and pass it down to {{name}} as a prop.",
					avoidPassingDataToParentInHook: "Avoid passing data to parents in an effect. Instead, return \"{{data}}\" from {{name}}."
				}
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || effect.cleanup) return;
				effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isPropCall(context, ref)).filter((ref) => !isRefCall(context, ref)).forEach((ref) => {
					const callExpr = getCallExpr(ref);
					if (!callExpr) return;
					const dataArgs = getArgsUpstreamRefs(context, ref).filter((ref) => getUpstreamRefs(context, ref).length === 1).filter((ref) => !isUseState(ref.identifier) && !isProp(context, ref) && !isUseRef(ref.identifier) && !isRefCurrent(ref) && !isConstant(ref));
					if (dataArgs.length === 0) return;
					const containingNode = findEnclosingReactNode(context, node);
					const isInCustomHook = containingNode && isCustomHook(containingNode);
					context.report({
						node: callExpr,
						messageId: isInCustomHook ? "avoidPassingDataToParentInHook" : "avoidPassingDataToParentInComponent",
						data: {
							data: dataArgs.map((r) => r.identifier.name).map((n) => `"${n}"`).join(" and "),
							name: (() => {
								const n = getComponentName(containingNode);
								return n ? `"${n}"` : isInCustomHook ? "this custom hook" : "this component";
							})()
						}
					});
				});
			} })
		},
		"no-external-store-subscription": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow subscribing to an external store in an effect.",
					url: "https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store"
				},
				schema: [],
				messages: { avoidExternalStoreSubscription: "Avoid using an effect to subscribe to an external store. Instead, use \"useSyncExternalStore\" to manage \"{{state}}\"." }
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || !effect.cleanup) return;
				const bodySetters = effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isStateCall(context, ref));
				if (bodySetters.length === 0) return;
				const cleanupArg = effect.cleanup.argument;
				if (!cleanupArg) return;
				const cleanupRefs = getDownstreamRefs(context, cleanupArg);
				findDownstreamNodes(context, cleanupArg, "CallExpression").forEach((callExpr) => {
					if (callExpr.type !== "CallExpression") return;
					for (const arg of callExpr.arguments) {
						if (!arg) continue;
						cleanupRefs.push(...getDownstreamRefs(context, arg));
					}
				});
				const cleanupVars = /* @__PURE__ */ new Set();
				for (const ref of cleanupRefs) for (const upRef of getUpstreamRefs(context, ref)) if (upRef.resolved) cleanupVars.add(upRef.resolved);
				for (const ref of bodySetters) {
					if (!getUpstreamRefs(context, ref).some((upRef) => upRef.resolved && cleanupVars.has(upRef.resolved))) continue;
					const callExpr = getCallExpr(ref);
					if (!callExpr) continue;
					const stateName = getStateName(context, ref);
					if (!stateName) continue;
					context.report({
						node: callExpr,
						messageId: "avoidExternalStoreSubscription",
						data: { state: stateName }
					});
				}
			} })
		},
		"no-initialize-state": {
			meta: {
				type: "suggestion",
				docs: {
					description: "Disallow initializing state in an effect.",
					url: "https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store"
				},
				schema: [],
				messages: { avoidInitializingState: "Avoid initializing state in an effect. Instead, initialize \"{{state}}\"'s \"useState()\" with \"{{arguments}}\". For SSR hydration, prefer \"useSyncExternalStore\"." }
			},
			create: (context) => ({ CallExpression: (node) => {
				const effect = getEffect(context, node);
				if (!effect || !effect.depsRefs) return;
				if (!(effect.depsRefs.filter((ref) => !isStateSetter(ref)).length === 0)) return;
				effect.fnRefs.filter((ref) => isSynchronous(ref.identifier, effect.fn)).filter((ref) => isStateCall(context, ref)).forEach((ref) => {
					const callExpr = getCallExpr(ref);
					if (!callExpr) return;
					const stateName = getStateName(context, ref);
					if (!stateName) return;
					let argumentText = "undefined";
					if (callExpr && callExpr.type === "CallExpression" && callExpr.arguments[0]) argumentText = context.sourceCode.getText(callExpr.arguments[0]);
					context.report({
						node: callExpr,
						messageId: "avoidInitializingState",
						data: {
							state: stateName,
							arguments: argumentText
						}
					});
				});
			} })
		}
	},
	configs: {}
};
export { plugin as default };
