import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Widget } from "ui-kit";

const styles = stylex.create({ box: { padding: 8 } });

export type Props = { styles?: StyleXStyles };

export const Bad = () => <><Widget sx={styles.box} /><Button className={styles.box} /></>;
