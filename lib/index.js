/**
 * dsh-plugin-peak-pricing host half.
 *
 * All pricing-period computation happens in the browser half (native Date,
 * Beijing time = UTC+8 without DST), so this half only carries the plugin
 * identity inside the loader tree.
 */
export const name = "dsh-plugin-peak-pricing";
export const inject = [];
export function apply() {}
