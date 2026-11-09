import chestBack from './chest-back.mjs';
import shouldersArms from './shoulders-arms.mjs';
import legs from './legs.mjs';
import coreFullbody from './core-fullbody.mjs';

/** Exercise name -> English step instructions. Keys must match the dataset exactly. */
const STEPS_EN = { ...chestBack, ...shouldersArms, ...legs, ...coreFullbody };

export default STEPS_EN;
