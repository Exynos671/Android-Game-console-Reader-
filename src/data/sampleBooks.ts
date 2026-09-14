import { Book } from '../types';

/**
 * Built-in sample shipped with the app. Only The Time Machine is kept (all
 * other demo titles were removed in v3.1 to keep the shelf clean).
 */
export const SAMPLE_BOOKS: Book[] = [
  {
    id: 'sample_epub_wells',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    format: 'epub',
    description: 'The pioneering 1895 science-fiction masterpiece exploring the Fourth Dimension, the gentle Eloi, and the subterranean Morlocks.',
    fileSize: '420 KB',
    totalChapters: 6,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 6,
    lastReadTimestamp: Date.now() - 1000 * 60 * 30,
    bookmarks: [1, 3],
    chapters: [
      {
        id: 'tm_chap_1',
        title: 'Chapter I: The Fourth Dimension',
        content: `
        <div class="space-y-4">
          <p class="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:text-amber-500">The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated.</p>
          <p>The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.</p>
          <p>Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought roams gracefully free of the trammels of precision.</p>
          <p class="font-serif italic pl-4 border-l-2 border-amber-500/40 my-6">"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."</p>
          <p>"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair.</p>
          <p>"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Neither has a mathematical plane. These things are mere abstractions."</p>
          <p>"That is all right," said the Psychologist.</p>
          <p>"Nor, having only length, breadth, and thickness, can a cube have a real existence."</p>
          <p>"There I object," said Filby. "Of course a solid body may exist. All real things鈥?</p>
          <p>"So most people think. But wait a moment. Can an instantaneous cube exist?"</p>
          <p>"Don't follow you," said Filby.</p>
          <p>"Can a cube that does not exist for any time at all, have any real existence?"</p>
          <p>Filby became pensive. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and鈥擠uration."</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_2',
        title: 'Chapter II: The Machine Revealed',
        content: `
        <div class="space-y-4">
          <p>The thing the Time Traveller held in his hand was a glittering metallic framework, scarcely larger than a small clock, and very delicately made.</p>
          <p>There was ivory in it, and some transparent crystalline substance. And now I must be plain, for this that follows鈥攗nless his explanation is to be accepted鈥攊s an absolutely unaccountable thing.</p>
          <p>He took one of the small octagonal tables that were scattered about the room, and set it in front of the fire, with two legs on the hearthrug. On this table he placed the mechanism. Then he drew up a chair, and sat down.</p>
          <p>The only other object on the table was a small shaded lamp, the bright light of which fell full upon the model. There were also perhaps a dozen candles in lanterns about the room, making the light pleasant and soft.</p>
          <p class="font-serif italic pl-4 border-l-2 border-amber-500/40 my-6">"It is simply this," he said, touching a lever. "A vehicle that travels through time as comfortably as a locomotive travels through space."</p>
          <p>We all looked at it. The Medical Man looked through his spectacles. The Psychologist rubbed his chin. The Provincial Mayor smiled knowingly.</p>
          <p>The Time Traveller pushed the lever forward. An eddy of wind seemed to sweep through the room, the candles flickered, and the tiny device became indistinct, like a spinning wheel, and vanished altogether!</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_3',
        title: 'Chapter III: The Year 802,701 A.D.',
        content: `
        <div class="space-y-4">
          <p>I drew a long breath, set my teeth, gripped the starting lever with both hands, and went off with a thud.</p>
          <p>The laboratory grew faint and hazy. Mrs. Watchett came in, and walked, apparently without seeing me, towards the garden door. I suppose it took her a minute to traverse the place, but to my eyes she seemed to dart across the room like a rocket.</p>
          <p>I pressed the lever over to its extreme position. The night came like the turning out of a lamp, and in another moment came tomorrow. The laboratory grew faint and hazy, then disappeared.</p>
          <p>I saw trees growing and changing like puffs of vapour, now brown, now green; they grew, spread, shivered, and passed away. I saw huge and splendid buildings rise up faint and fair, and pass like dreams.</p>
          <p>At last I stopped. I was in a lush green garden, surrounded by giant Rhododendrons and towering marble edifices under a radiant, warm sky. Before me stood a colossal figure sculpted in white stone鈥攁 winged Sphinx.</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_4',
        title: 'Chapter IV: The Golden Age of Eloi',
        content: `
        <div class="space-y-4">
          <p>In another moment we were standing face to face, I and this fragile creature of the future.</p>
          <p>He was a slight thing, perhaps four feet high, clad in a purple tunic, girdled at the waist with a leather belt. Sandals or buskins鈥擨 could not clearly see which鈥攚ere on his feet; his legs were bare to the knees, and his head was bare.</p>
          <p>Noticing the delicacy of his limbs, I at once foresaw for the human race a graceful atrophy, which had indeed been long impending.</p>
          <p>He came straight up to me and laughed into my eyes. The absence of any sign of fear from him struck me at once. Then he turned to the two others who were following him and spoke to them in a strange and very sweet and liquid tongue.</p>
          <p>They brought me garlands of strange, fragrant blossoms and draped them across my neck. They ate only luscious fruits, sweet and bursting with juices, beside glittering fountains.</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_5',
        title: 'Chapter V: The Dark Underworld',
        content: `
        <div class="space-y-4">
          <p>It was on the third day of my visit that I discovered the truth about this paradise.</p>
          <p>Scattered everywhere across the plains were deep circular wells, each flanked by a bronze cover. From their depths came a steady, rhythmic thudding sound鈥攖he pulse of subterranean machinery.</p>
          <p>And then, in the pitch black shadows of a ruined gallery, I saw two eyes watching me鈥攚hite, luminescent, and reflecting the light like the eyes of a cat.</p>
          <p>A strange, pale creature scrambled down a metal rung into the dark. It was bleached white, with flaxen hair upon its back, and great pupil-less eyes.</p>
          <p>The human species had bifurcated! The pretty, leisure-dwelling Eloi above, and the grim, industrious Morlocks who lived below in darkness... and came out to hunt when the moon was new.</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_6',
        title: 'Chapter VI: The Final Flight',
        content: `
        <div class="space-y-4">
          <p>With a desperate sprint I broke through the bronze doors of the White Sphinx. The Morlocks had trapped my machine inside, hoping to catch me!</p>
          <p>They swarmed over me in the dark, their cold, soft fingers clutching at my neck and boots. I struck a match鈥攖he blinding glare threw them back with shrill cries of pain.</p>
          <p>I leaped into the saddle of the Time Machine, slipped the nickel bars into their sockets, and pulled the lever!</p>
          <p>The sounds of the Morlocks ceased instantly. The suffocating darkness vanished. I had slipped once again into the boundless currents of time, hurtling forward across the dying eons of Earth.</p>
        </div>
        `,
      },
    ],
  },
];

