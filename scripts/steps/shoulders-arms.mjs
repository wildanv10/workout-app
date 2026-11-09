/* English instructions for the Shoulders and Arms sections.
   Translated from the Indonesian steps in the Exercise Library artifact, one
   imperative sentence per original step, in the original order. */

const SHOULDERS_ARMS = {
  // ------------------------------------------------------------ Shoulders
  'Barbell Overhead Press': [
    'Take the bar off the rack at shoulder height with a grip slightly wider than your shoulders.',
    'Stand with your feet hip width apart and brace your abs and glutes.',
    'Press the bar straight up, moving your head back slightly so the bar can pass.',
    'Lock your arms out overhead with the bar over the middle of your feet, then lower it to your shoulders.',
  ],
  'Seated Dumbbell Shoulder Press': [
    'Set the bench upright and sit with the dumbbells beside your shoulders, palms facing forward.',
    'Keep your back against the backrest and your abs braced.',
    'Press the dumbbells up until your arms are almost straight.',
    'Lower slowly until they are level with your ears, then repeat.',
  ],
  'Arnold Press': [
    'Sit tall holding the dumbbells in front of your shoulders with your palms facing you.',
    'Press up while rotating your palms until they face forward.',
    'Lock your arms out overhead.',
    'Lower while rotating back to the starting position.',
  ],
  'Machine Shoulder Press': [
    'Adjust the seat so the handles line up with your shoulders, then sit with your back against the pad.',
    'Grip the handles with your elbows below your hands.',
    'Press the handles up until your arms are almost straight.',
    'Lower slowly, then repeat.',
  ],
  'Dumbbell Lateral Raise': [
    'Stand tall with the dumbbells at your sides and your elbows slightly bent.',
    'Lift the dumbbells out to the sides until your arms are level with your shoulders.',
    'Lead the movement with your elbows and do not shrug your shoulders toward your ears.',
    'Lower slowly, then repeat.',
  ],
  'Dumbbell Front Raise': [
    'Stand with the dumbbells in front of your thighs, palms facing your body.',
    'Raise one or both dumbbells forward with your arms almost straight.',
    'Stop when your arms are level with your shoulders.',
    'Lower slowly, without swinging your torso.',
  ],
  'Bent-over Reverse Fly': [
    'Hinge forward from your hips until your torso is almost parallel to the floor, back flat.',
    'Hold the dumbbells below your chest with your palms facing each other and your elbows slightly bent.',
    'Open your arms out to the sides until they are level with your body.',
    'Lower slowly, then repeat; you can also do this on a pec deck set to the rear-delt position.',
  ],
  'Upright Row': [
    'Stand holding an EZ bar in front of your thighs with a shoulder-width grip.',
    'Pull the bar up close to your body with your elbows leading.',
    'Stop when your elbows reach shoulder height.',
    'Lower slowly, then repeat.',
  ],
  'Landmine Press': [
    'Set one end of a barbell in the landmine and hold the other end in front of your shoulder.',
    'Stand with your feet apart or in a half-kneeling position, abs braced.',
    'Press the bar up and forward until your arm is straight.',
    'Lower it back to the front of your shoulder, finish your reps, then switch sides.',
  ],
  'Pike Push-up': [
    'Start in a push-up position, then lift your hips high into an inverted V.',
    'Keep your hands shoulder width apart and your head between your arms.',
    'Bend your elbows and lower your head toward the floor in front of your hands.',
    'Press back up until your arms are straight.',
  ],
  'Wall Handstand Push-up': [
    'Get into a handstand facing the wall or with your back to it, hands shoulder width apart.',
    'Brace your abs and glutes and keep your body straight.',
    'Lower your head slowly until it almost touches the floor.',
    'Press back up until your arms are straight.',
  ],

  // ----------------------------------------------------------------- Arms
  'Barbell Curl': [
    'Stand tall holding a barbell underhand at shoulder width.',
    'Keep your elbows pinned to your sides.',
    'Curl the bar toward your shoulders by bending your elbows.',
    'Lower slowly until your arms are straight, without swinging your torso.',
  ],
  'Alternating Dumbbell Curl': [
    'Stand with the dumbbells at your sides, palms facing your thighs.',
    'Curl one dumbbell up while rotating your palm to face upward.',
    'Squeeze your biceps at the top, then lower slowly.',
    'Repeat with the other arm, alternating sides.',
  ],
  'Hammer Curl': [
    'Stand with the dumbbells at your sides, palms facing each other.',
    'Curl the dumbbells up, keeping that neutral grip.',
    'Keep your elbows at your sides.',
    'Lower slowly, then repeat.',
  ],
  'Preacher Curl': [
    'Sit at the preacher bench with your upper arms resting on the pad.',
    'Hold the EZ bar with an underhand grip.',
    'Curl the bar up until your forearms are almost vertical.',
    'Lower slowly until your arms are almost straight, then repeat.',
  ],
  'Incline Dumbbell Curl': [
    'Set the bench to 45–60° and lie back with your arms hanging straight down.',
    'Hold the dumbbells with your palms facing forward.',
    'Curl the dumbbells up without letting your elbows drift forward.',
    'Lower slowly until your arms are fully straight.',
  ],
  'Reverse Curl': [
    'Stand holding an EZ bar overhand, with your palms facing down.',
    'Keep your elbows at your sides.',
    'Curl the bar up toward your shoulders.',
    'Lower slowly, then repeat.',
  ],
  'Triceps Pushdown': [
    'Attach a rope or straight bar to the high pulley.',
    'Stand tall with your elbows tucked against your sides.',
    'Press the handle down until your arms are straight.',
    'Return slowly until your forearms are parallel to the floor.',
  ],
  'Skull Crusher': [
    'Lie on a flat bench holding an EZ bar above your chest with straight arms.',
    'Tilt your upper arms slightly back toward your head.',
    'Bend your elbows and lower the bar to your forehead or just behind your head.',
    'Straighten your elbows again without moving your upper arms.',
  ],
  'Overhead Triceps Extension': [
    'Stand or sit holding one dumbbell overhead with both hands.',
    'Keep your elbows pointing forward and close to your head.',
    'Lower the dumbbell behind your head by bending your elbows.',
    'Straighten your arms fully back overhead, without flaring your ribs.',
  ],
  'Close-grip Bench Press': [
    'Lie on the bench and grip the bar at shoulder width.',
    'Unrack the bar and hold it above your chest.',
    'Lower the bar to your lower chest with your elbows close to your body.',
    'Press up until your arms are straight.',
  ],
  'Bench Dip': [
    'Sit on the edge of a bench and place your hands beside your hips.',
    'Slide your hips forward off the bench with your legs straight or bent.',
    'Bend your elbows and lower your hips until your elbows reach about 90°.',
    'Press back up until your arms are straight.',
  ],
  'Wrist Curl': [
    'Sit and rest your forearms on your thighs or a bench with your palms facing up.',
    'Let your wrists hang just past the edge.',
    'Curl your wrists upward as far as you can.',
    'Lower slowly, then repeat.',
  ],
  'Reverse Wrist Curl': [
    'Rest your forearms on your thighs or a bench with your palms facing down.',
    'Let your wrists hang just past the edge.',
    'Lift the backs of your hands upward.',
    'Lower slowly, then repeat.',
  ],
  "Farmer's Carry": [
    'Pick up a heavy dumbbell or kettlebell in each hand.',
    'Stand tall with your shoulders back and your abs braced.',
    'Walk with short, steady steps for the set distance.',
    'Set the weights down by bending your knees and hips.',
  ],
};

export default SHOULDERS_ARMS;
