import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Widget } from "ui-kit";

const styles = stylex.create({ box: { padding: 8 } });

export const Good = () => <><Widget {...stylex.props(styles.box)} /><Button sx={styles.box} /></>;
