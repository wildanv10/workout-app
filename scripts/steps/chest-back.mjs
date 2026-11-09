/* English instructions for the Chest and Back sections.
   Translated from the Indonesian steps in the Exercise Library artifact, one
   imperative sentence per original step, in the original order. */

const CHEST_BACK = {
  // ---------------------------------------------------------------- Chest
  'Barbell Bench Press': [
    'Lie on the flat bench with your eyes directly under the barbell and both feet planted on the floor.',
    'Grip the bar slightly wider than shoulder width and pull your shoulder blades back and down.',
    'Unrack the bar and hold it over your chest with your arms straight.',
    'Lower the bar slowly until it touches your mid-to-lower chest, elbows about 45–70° from your body.',
    'Press the bar back up until your arms are straight, then repeat; rack the bar when you finish.',
  ],
  'Incline Barbell Bench Press': [
    'Set the bench back to a 30–45° angle, then lie down with your eyes under the barbell.',
    'Grip the bar slightly wider than shoulder width and squeeze your shoulder blades together.',
    'Unrack the bar and hold it over your upper chest with your arms straight.',
    'Lower the bar to your upper chest, just below the collarbone, under control.',
    'Press back up without lifting your hips off the bench.',
  ],
  'Decline Bench Press': [
    'Hook your feet under the pads of the decline bench, then lie back with your head lower than your hips.',
    'Grip the bar slightly wider than shoulder width and unrack it.',
    'Lower the bar to your lower chest with your elbows tucked slightly toward your body.',
    'Press the bar up until your arms are straight, then repeat.',
  ],
  'Dumbbell Bench Press': [
    'Sit on the end of the bench with the dumbbells on your thighs, then lie back as you bring them to the sides of your chest.',
    'Position the dumbbells level with your chest, palms facing your feet, shoulder blades squeezed together.',
    'Press both dumbbells up until your arms are straight and the dumbbells nearly meet.',
    'Lower slowly until your elbows are just below the bench, then repeat.',
  ],
  'Incline Dumbbell Press': [
    'Set the bench to a 30–45° angle, sit down and bring the dumbbells to the front of your shoulders.',
    'Lie back with your back and head against the bench and your feet planted.',
    'Press the dumbbells up over your upper chest until your arms are straight.',
    'Lower slowly until the dumbbells are level with your upper chest, then repeat.',
  ],
  'Dumbbell Fly': [
    'Lie on a flat bench holding the dumbbells above your chest with your palms facing each other.',
    'Bend your elbows slightly and keep that angle throughout the movement.',
    'Open your arms out to the sides in a wide arc until you feel a stretch across your chest.',
    'Bring the dumbbells back together above your chest as if hugging a tree, then repeat.',
  ],
  'Cable Crossover': [
    'Attach a D-handle to both pulleys in the high position and hold one in each hand.',
    'Step forward with one foot, lean your torso slightly forward, elbows slightly bent.',
    'Pull both handles down and inward until they meet in front of your hips.',
    'Hold briefly while squeezing your chest, then return slowly to the start.',
  ],
  'Pec Deck Fly': [
    'Adjust the seat height so the handles sit level with your chest, then sit with your back against the pad.',
    'Hold the handles with your elbows slightly bent.',
    'Bring both arms together in front of you until the handles almost touch.',
    'Return slowly until you feel a stretch across your chest, then repeat.',
  ],
  'Machine Chest Press': [
    'Adjust the seat so the handles line up with your mid chest, then sit with your back against the pad.',
    'Grip the handles with your shoulder blades pinned to the backrest.',
    'Press the handles forward until your arms are almost straight.',
    'Return slowly until your elbows are just behind your body, then repeat.',
  ],
  'Push-up': [
    'Start in a high plank: palms on the floor slightly wider than your shoulders, body straight from head to heels.',
    'Brace your abs and glutes so your hips do not sag.',
    'Bend your elbows to about 45° from your body and lower your chest until it almost touches the floor.',
    'Push the floor away until your arms are straight again, then repeat.',
  ],
  'Diamond Push-up': [
    'Start in a high plank with both hands under your chest, thumbs and index fingers forming a diamond.',
    'Keep your body straight and your abs braced.',
    'Lower your chest toward your hands, keeping your elbows close to your body.',
    'Press back up until your arms are straight.',
  ],
  'Archer Push-up': [
    'Start in a push-up position with your hands set very wide.',
    'Lower your body toward one hand while the other arm stays straight out to the side.',
    'Press back up to the centre, then repeat to the other side.',
    'Keep your hips level and square, without twisting.',
  ],
  'Pseudo Planche Push-up': [
    'Start in a push-up position with your hands beside your waist, fingers pointing out to the sides or behind you.',
    'Lean your body forward until your shoulders are well past your hands.',
    'Lower your chest while holding that forward lean and keeping your body straight.',
    'Press back up without losing the lean, then repeat.',
  ],
  'Chest Dip': [
    'Grip the parallel bars and press up until your arms are straight.',
    'Lean your torso forward about 30° and bend your knees back behind you.',
    'Lower your body by bending your elbows until your shoulders are slightly below your elbows.',
    'Press back up until your arms are straight.',
  ],
  'Ring Dip': [
    'Grip the rings and get into a support position with straight arms, rings close to your body.',
    'Turn the rings slightly outward to stabilise your shoulders.',
    'Lower your body slowly until your shoulders are level with your elbows, keeping the rings close.',
    'Press back up to the support position, then repeat.',
  ],

  // ---------------------------------------------------------------- Back
  'Pull-up': [
    'Hang from the bar with an overhand grip slightly wider than shoulder width.',
    'Pull your shoulders down away from your ears and brace your abs.',
    'Pull your body up until your chin clears the bar, driving your elbows down.',
    'Lower slowly until your arms are fully straight, then repeat.',
  ],
  'Chin-up': [
    'Hang from the bar with an underhand grip at shoulder width.',
    'Pull your shoulders down and brace your abs.',
    'Pull your body up until your chin clears the bar.',
    'Lower slowly until your arms are straight, then repeat.',
  ],
  'Lat Pulldown': [
    'Sit with your thighs locked under the pads and grip the bar wider than shoulder width.',
    'Lean your torso back slightly and lift your chest.',
    'Pull the bar to your upper chest, driving your elbows down and back.',
    'Return the bar slowly until your arms are straight, then repeat.',
  ],
  'Straight-arm Pulldown': [
    'Attach a straight bar or rope to the high pulley and stand facing the machine.',
    'Lean your torso slightly forward with your arms straight and elbows softly bent.',
    'Pull the bar down in an arc until it reaches your thighs.',
    'Return slowly up to head height, then repeat.',
  ],
  'Seated Cable Row': [
    'Sit with your feet on the platform and your knees slightly bent, holding the V-bar.',
    'Sit tall with your chest open and your back neutral.',
    'Pull the handle to your stomach while squeezing your shoulder blades together.',
    'Return slowly until your arms are straight, without rounding your back, then repeat.',
  ],
  'Bent-over Barbell Row': [
    'Stand with your feet hip width apart, holding the barbell overhand slightly wider than your shoulders.',
    'Bend your knees slightly and hinge forward from the hips to about 45° with a flat back.',
    'Pull the bar to your lower stomach while squeezing your shoulder blades together.',
    'Lower the bar slowly until your arms are straight, then repeat.',
  ],
  'One-arm Dumbbell Row': [
    'Place one knee and one hand on the bench with your back parallel to the floor.',
    'Hold a dumbbell in your other hand with that arm hanging straight down.',
    'Pull the dumbbell toward your hip, keeping your elbow close to your body.',
    'Lower slowly, finish all your reps, then switch sides.',
  ],
  'T-Bar Row': [
    'Stand on the T-bar footplate, or rest your chest on the pad for the chest-supported version.',
    'Hold the handles and hinge forward from your hips with a flat back.',
    'Pull the handles to your lower chest while squeezing your shoulder blades together.',
    'Lower slowly until your arms are straight, then repeat.',
  ],
  'Inverted Row': [
    'Set a bar at waist height in a rack or Smith machine, then lie underneath it.',
    'Grip the bar slightly wider than your shoulders, body straight from head to heels.',
    'Pull your chest up to the bar while squeezing your shoulder blades together.',
    'Lower slowly until your arms are straight, then repeat.',
  ],
  'Face Pull': [
    'Attach a rope to a pulley at face height and hold both ends with your thumbs pointing back.',
    'Step back until the cable is under tension and stand tall.',
    'Pull the rope toward your face, opening your hands out beside your ears with your elbows high.',
    'Hold briefly, then return slowly.',
  ],
  'Barbell Shrug': [
    'Stand tall holding the barbell in front of your thighs with a shoulder-width grip.',
    'Keep your arms straight and your chest open.',
    'Lift your shoulders straight up toward your ears, as high as you can.',
    'Hold briefly, then lower slowly.',
  ],
  'Barbell Deadlift': [
    'Stand with your feet hip width apart and the bar over the middle of your feet.',
    'Hinge at your hips and knees and grip the bar just outside your legs, back flat and chest lifted.',
    'Take a breath, brace your abs, then push the floor away with your legs while keeping the bar close to your body.',
    'Stand up to full height with your hips locked out, without arching backwards.',
    'Lower the bar by pushing your hips back first, then bending your knees.',
  ],
  'Trap Bar Deadlift': [
    'Stand in the centre of the trap bar with your feet hip width apart.',
    'Squat down and grip the side handles with a flat back and your chest lifted.',
    'Push the floor away and stand up tall, keeping your torso upright.',
    'Lower back down under control until the plates touch the floor.',
  ],
  'Back Extension': [
    'Set the pad so it sits just below your hip bones and lock your heels under the supports.',
    'Cross your arms over your chest with your body straight.',
    'Hinge forward from your hips to almost 90°.',
    'Lift back up until your body is in line with your legs, without overarching.',
  ],
  Superman: [
    'Lie face down on the mat with your arms straight ahead and your legs straight.',
    'Lift your arms, chest, and legs off the floor at the same time.',
    'Hold for 2–3 seconds while squeezing your glutes and lower back.',
    'Lower slowly, then repeat.',
  ],
  'Muscle-up': [
    'Hang from the bar with your grip slightly over the top of it, using a false grip on rings.',
    'Make a small swing, then pull the bar explosively toward your hips.',
    'As your chest reaches the bar, lean your torso forward and rotate your elbows over the bar.',
    'Press up like a dip until your arms are straight above the bar.',
    'Lower slowly back to the hang, then repeat.',
  ],
  'Tuck Front Lever': [
    'Hang from the bar with an overhand grip at shoulder width.',
    'Press down on the bar with straight arms while pulling your knees to your chest.',
    'Lift your hips until your back is parallel to the floor.',
    'Hold for 5–15 seconds with your arms straight, then lower slowly.',
  ],
};

export default CHEST_BACK;
