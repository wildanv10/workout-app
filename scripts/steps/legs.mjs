/* English instructions for the Legs & Glutes section.
   Translated from the Indonesian steps in the Exercise Library artifact, one
   imperative sentence per original step, in the original order. */

const LEGS = {
  'Barbell Back Squat': [
    'Rest the bar on your upper back, above your trapezius, unrack it and step back two paces.',
    'Set your feet shoulder width apart with your toes turned slightly out.',
    'Take a breath, brace your abs, then descend by pushing your hips back and bending your knees.',
    'Descend until your thighs are at least parallel to the floor, with your knees tracking over your toes.',
    'Push the floor away and stand back up until your hips and knees are straight.',
  ],
  'Front Squat': [
    'Rest the bar across the front of your shoulders with your elbows high in front, in the front rack position.',
    'Unrack the bar and set your feet shoulder width apart.',
    'Descend with your torso upright until your thighs are below parallel.',
    'Drive back up while keeping your elbows high.',
  ],
  'Goblet Squat': [
    'Hold a kettlebell or dumbbell in front of your chest with both hands.',
    'Set your feet slightly wider than your shoulders.',
    'Descend with your elbows tracking inside your knees, keeping your torso upright.',
    'Drive back up to standing.',
  ],
  'Bodyweight Squat': [
    'Stand with your feet shoulder width apart and your arms straight out in front.',
    'Push your hips back and bend your knees.',
    'Descend until your thighs are parallel to the floor, keeping your heels down.',
    'Stand back up while squeezing your glutes.',
  ],
  'Leg Press': [
    'Sit with your back against the pad and your feet on the platform at shoulder width.',
    'Release the safeties and straighten your legs without locking your knees.',
    'Lower the platform until your knees reach about 90°, without letting your hips lift.',
    'Press the platform back up.',
  ],
  'Hack Squat': [
    'Stand on the platform with your back and shoulders against the pads.',
    'Set your feet shoulder width apart in the middle of the platform and release the safeties.',
    'Descend by bending your knees until your thighs are parallel to the platform.',
    'Drive back up.',
  ],
  'Bulgarian Split Squat': [
    'Stand with your back to a bench and rest the top of your rear foot on it.',
    'Step your front foot far enough forward, holding dumbbells if you want load.',
    'Lower your body until your front thigh is parallel to the floor.',
    'Drive through your front foot to stand back up; finish your reps, then switch sides.',
  ],
  'Walking Lunge': [
    'Stand tall, holding dumbbells at your sides if you want extra load.',
    'Take a long step forward and lower your back knee almost to the floor.',
    'Both knees should form roughly 90° angles.',
    'Drive through your front foot and step straight into the next lunge with the other leg.',
  ],
  'Step-up': [
    'Stand in front of a box or bench and place one foot on top of it.',
    'Drive through the foot on the box until you are standing fully upright.',
    'Step down slowly, with the same leg controlling the movement.',
    'Finish your reps, then switch legs.',
  ],
  'Romanian Deadlift': [
    'Stand tall holding a barbell in front of your thighs.',
    'Bend your knees slightly and lock them at that angle.',
    'Push your hips back and lower the bar close to your legs until you feel a stretch in your hamstrings.',
    'Return to standing by driving your hips forward.',
  ],
  'Sumo Deadlift': [
    'Stand with a very wide stance, toes turned out, and the bar over the middle of your feet.',
    'Grip the bar between your legs with straight arms.',
    'Lift your chest, push your knees out, then push the floor away to stand up.',
    'Lock your hips out at the top, then lower under control.',
  ],
  'Leg Extension': [
    "Sit with your knees in line with the machine's pivot and the pad over your ankles.",
    'Hold the handles beside the seat.',
    'Straighten your legs until your knees are almost locked.',
    'Lower slowly, then repeat.',
  ],
  'Leg Curl': [
    'Lie face down, or sit, with the pad over your heels.',
    "Make sure your knees line up with the machine's pivot.",
    'Bend your knees and pull your heels toward your glutes.',
    'Return slowly until your legs are almost straight.',
  ],
  'Nordic Hamstring Curl': [
    'Kneel on a mat with your heels locked down by a partner or a support.',
    'Keep your body straight from your knees to your head, hands in front of your chest.',
    'Lean forward as slowly as you can, resisting with your hamstrings.',
    'Catch yourself with your hands when you can no longer hold, then push back up.',
  ],
  'Barbell Hip Thrust': [
    'Sit with your upper back against the edge of a bench and the barbell over your hips.',
    'Plant your feet hip width apart with your knees bent.',
    'Drive your hips up until your body is straight from your shoulders to your knees.',
    'Squeeze your glutes at the top, then lower slowly.',
  ],
  'Glute Bridge': [
    'Lie on your back with your knees bent and your feet flat on the floor.',
    'Rest your arms at your sides.',
    'Lift your hips until your body is straight from your shoulders to your knees.',
    'Hold briefly, then lower slowly.',
  ],
  'Hip Abduction Machine': [
    'Sit with the pads against the outside of your knees.',
    'Rest your back against the backrest and hold the handles.',
    'Push your legs outward as far as you can.',
    'Return slowly, then repeat.',
  ],
  'Hip Adduction Machine': [
    'Sit with the pads against the inside of your knees and your legs apart.',
    'Rest your back against the backrest and hold the handles.',
    'Squeeze your legs together toward the middle.',
    'Open them back out slowly, then repeat.',
  ],
  'Copenhagen Plank': [
    'Get into a side plank beside a bench and rest your top leg on it.',
    'Support yourself on your elbow on the floor.',
    'Lift your hips until your body is straight, with your bottom leg hanging free.',
    'Hold for 10–30 seconds, then switch sides.',
  ],
  'Pistol Squat': [
    'Stand on one leg with the other leg straight out in front of you.',
    'Hold your arms out in front for balance.',
    'Lower slowly on the standing leg until your glutes approach your heel.',
    'Drive back up without letting your front foot touch the floor.',
  ],
  'Box Jump': [
    'Stand in front of the box with your feet hip width apart.',
    'Bend your knees and swing your arms back.',
    'Jump explosively and land softly on top of the box with your knees bent.',
    'Stand up tall, then step back down.',
  ],
  'Standing Calf Raise': [
    'Stand in the machine with the pads on your shoulders and the balls of your feet on the edge of the platform.',
    'Lower your heels below the platform until your calves stretch.',
    'Lift your heels as high as you can.',
    'Hold briefly, then lower slowly.',
  ],
  'Seated Calf Raise': [
    'Sit with the pad over your thighs near your knees and the balls of your feet on the platform.',
    'Release the safety.',
    'Lift your heels as high as you can.',
    'Lower slowly until your calves stretch.',
  ],
  'Tibialis Raise': [
    'Lean against a wall with your heels about one step in front of you.',
    'Keep your legs straight with your weight on your heels.',
    'Lift your toes up toward your shins as high as you can.',
    'Lower slowly, then repeat.',
  ],
  'Kettlebell Swing': [
    'Stand with your feet slightly wider than your shoulders and the kettlebell in front of you.',
    'Hinge from your hips, grip the kettlebell and swing it back between your legs.',
    'Drive your hips forward powerfully so the kettlebell swings up to chest height.',
    'Let the kettlebell fall back between your legs and go straight into the next rep.',
  ],
};

export default LEGS;
