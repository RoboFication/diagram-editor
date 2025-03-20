import { exportBDDPlantUML } from "./exportBDDPlantUML";
import { buildJointJSFromBDD } from "./parseBDDPlantUML";

export const exportDiagram = exportBDDPlantUML;
export const parseDiagram = buildJointJSFromBDD;
