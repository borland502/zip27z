import * as globals from "./index";

Object.assign(globalThis, {
	...globals,
});

declare global {
	const $: typeof globals.$;
}
