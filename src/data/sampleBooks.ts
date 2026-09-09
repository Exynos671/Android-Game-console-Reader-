import { Book, ComicPage } from '../types';

/**
 * Generate stylized graphic novel / manga comic pages as high-resolution SVG data URLs
 */
function createMangaPageSvg(pageNumber: number, title: string, panelTheme: 'action' | 'dialogue' | 'climax' | 'intro'): string {
  const isAction = panelTheme === 'action' || panelTheme === 'climax';
  const bgColor = isAction ? '#0f111a' : '#141722';
  const accent = pageNumber % 2 === 0 ? '#38bdf8' : '#f43f5e';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1450" width="1000" height="1450">
    <defs>
      <linearGradient id="panelGrad_${pageNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e2233" />
        <stop offset="100%" stop-color="#0b0d14" />
      </linearGradient>
      <linearGradient id="laser_${pageNumber}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.2" />
      </linearGradient>
    </defs>

    <!-- Page Canvas -->
    <rect width="1000" height="1450" fill="${bgColor}" />
    
    <!-- Manga Screentone Dots pattern -->
    <pattern id="dotPattern_${pageNumber}" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#ffffff" fill-opacity="0.04" />
    </pattern>
    <rect width="1000" height="1450" fill="url(#dotPattern_${pageNumber})" />

    <!-- Outer Manga Frame Margin -->
    <rect x="40" y="50" width="920" height="1350" fill="none" stroke="#2c3349" stroke-width="4" rx="8" />

    <!-- Top Running Header -->
    <text x="60" y="38" fill="#64748b" font-family="'JetBrains Mono', monospace" font-size="16" letter-spacing="3">CYBER BLADE: HANDHELD ODYSSEY // CHAPTER 0${pageNumber}</text>
    <text x="940" y="38" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="16" text-anchor="end" font-weight="bold">PAGE ${pageNumber}</text>

    <!-- Panel 1: Top Hero Establishing Panel -->
    <g transform="translate(60, 70)">
      <rect width="880" height="360" fill="url(#panelGrad_${pageNumber})" stroke="#384260" stroke-width="3" rx="6" />
      <!-- Speed lines -->
      <line x1="20" y1="50" x2="420" y2="80" stroke="${accent}" stroke-width="2" stroke-opacity="0.4" />
      <line x1="30" y1="120" x2="520" y2="150" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="10" y1="280" x2="390" y2="290" stroke="${accent}" stroke-width="2" stroke-opacity="0.4" />
      
      <!-- Cyber City Skyline silhouette -->
      <path d="M400,360 L400,180 L440,180 L440,240 L480,240 L480,120 L510,90 L540,120 L540,210 L590,210 L590,160 L640,160 L640,280 L720,280 L720,190 L760,190 L760,360 Z" fill="#08090f" />
      <rect x="495" y="60" width="4" height="30" fill="${accent}" />
      <circle cx="497" cy="55" r="5" fill="#f43f5e" />

      <!-- Neon Sign -->
      <rect x="100" y="110" width="220" height="48" fill="#000000" fill-opacity="0.7" stroke="${accent}" stroke-width="2" rx="4" />
      <text x="210" y="142" fill="${accent}" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="22" text-anchor="middle" letter-spacing="4">SECTOR 09-NEO</text>

      <!-- Handheld Console Icon Silhouette in panel -->
      <g transform="translate(680, 80)">
        <rect width="160" height="90" rx="16" fill="#1e2238" stroke="#60a5fa" stroke-width="2" />
        <rect x="35" y="15" width="90" height="60" rx="6" fill="#0284c7" fill-opacity="0.3" />
        <circle cx="18" cy="45" r="7" fill="#475569" />
        <circle cx="142" cy="38" r="4" fill="#f43f5e" />
        <circle cx="134" cy="50" r="4" fill="#38bdf8" />
      </g>

      <!-- Speech Bubble -->
      <path d="M80,220 Q80,180 180,180 L320,180 Q360,180 360,220 L360,260 Q360,290 310,290 L260,290 L230,320 L240,290 L180,290 Q80,290 80,250 Z" fill="#ffffff" />
      <text x="220" y="224" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="17" text-anchor="middle">"The handheld signal...</text>
      <text x="220" y="252" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="15" text-anchor="middle">It's coming from Sector 9!"</text>
    </g>

    <!-- Sound Effect Text (Manga Style) -->
    <text x="500" y="470" fill="#fbbf24" font-family="'Cinzel', serif" font-weight="900" font-size="52" text-anchor="middle" font-style="italic" letter-spacing="8" stroke="#000000" stroke-width="4">⚡ B Z Z Z T ! ⚡</text>

    <!-- Panel 2 (Left) & Panel 3 (Right) Split -->
    <g transform="translate(60, 490)">
      <!-- Left Panel -->
      <rect width="425" height="420" fill="url(#panelGrad_${pageNumber})" stroke="#384260" stroke-width="3" rx="6" />
      <!-- Manga Character Action Silhouette -->
      <circle cx="210" cy="180" r="70" fill="#1e293b" stroke="${accent}" stroke-width="3" />
      <!-- Cyber eye glowing -->
      <circle cx="225" cy="175" r="7" fill="${accent}" />
      <circle cx="225" cy="175" r="14" fill="${accent}" fill-opacity="0.2" />
      <!-- Speed lines -->
      <line x1="210" y1="180" x2="70" y2="70" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4" />
      <line x1="210" y1="180" x2="350" y2="70" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4" />
      <line x1="210" y1="180" x2="50" y2="300" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4" />

      <!-- Caption Box -->
      <rect x="25" y="320" width="375" height="75" fill="#090a10" fill-opacity="0.9" stroke="#475569" stroke-width="1.5" rx="4" />
      <text x="40" y="348" fill="#e2e8f0" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="600">MISSION DISPATCH // ENTRY ${pageNumber}</text>
      <text x="40" y="372" fill="#94a3b8" font-family="'Plus Jakarta Sans', sans-serif" font-size="13">"Optimal reading requires precision triggers. LB &amp; RB locked."</text>
    </g>

    <g transform="translate(515, 490)">
      <!-- Right Panel -->
      <rect width="425" height="420" fill="url(#panelGrad_${pageNumber})" stroke="#384260" stroke-width="3" rx="6" />
      <!-- Geometric Combat/Energy Grid -->
      <polygon points="50,350 210,120 370,350" fill="url(#laser_${pageNumber})" stroke="${accent}" stroke-width="2" />
      <circle cx="210" cy="220" r="45" fill="#020617" stroke="#38bdf8" stroke-width="3" />
      <text x="210" y="228" fill="#38bdf8" font-family="'JetBrains Mono', monospace" font-size="22" font-weight="bold" text-anchor="middle">SYNC</text>

      <!-- Speech Bubble Right -->
      <path d="M60,60 Q60,30 160,30 L320,30 Q360,30 360,60 L360,110 Q360,140 280,140 L210,140 L170,170 L180,140 L100,140 Q60,140 60,100 Z" fill="#ffffff" />
      <text x="210" y="75" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="16" text-anchor="middle">"4:3, 3:2, OR 16:9..."</text>
      <text x="210" y="105" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="17" text-anchor="middle" fill="#dc2626">"NO PIXELS ARE WASTED!"</text>
    </g>

    <!-- Panel 4: Bottom Dynamic Panoramic Climax -->
    <g transform="translate(60, 930)">
      <rect width="880" height="440" fill="url(#panelGrad_${pageNumber})" stroke="#384260" stroke-width="3" rx="6" />
      
      <!-- Grid Matrix Horizon -->
      <line x1="0" y1="300" x2="880" y2="300" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.5" />
      <line x1="440" y1="300" x2="0" y2="440" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="440" y1="300" x2="220" y2="440" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="440" y1="300" x2="440" y2="440" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="440" y1="300" x2="660" y2="440" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="440" y1="300" x2="880" y2="440" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.3" />

      <!-- Giant Manga Katakana / Sound FX -->
      <text x="440" y="150" fill="#ffffff" fill-opacity="0.15" font-family="sans-serif" font-size="120" font-weight="900" text-anchor="middle">ドドドドド</text>

      <!-- Center Dynamic Controller Frame -->
      <g transform="translate(240, 60)">
        <rect width="400" height="180" rx="30" fill="#0d111e" stroke="${accent}" stroke-width="3" />
        <!-- Handheld buttons illustration -->
        <rect x="90" y="30" width="220" height="120" rx="12" fill="#030712" stroke="#1f2937" stroke-width="2" />
        <text x="200" y="98" fill="#38bdf8" font-family="'JetBrains Mono', monospace" font-size="18" font-weight="bold" text-anchor="middle">${title}</text>
        <!-- Dpad -->
        <rect x="35" y="70" width="28" height="10" rx="2" fill="#475569" />
        <rect x="44" y="61" width="10" height="28" rx="2" fill="#475569" />
        <!-- Action buttons -->
        <circle cx="340" cy="65" r="7" fill="#f43f5e" />
        <circle cx="360" cy="78" r="7" fill="#fbbf24" />
        <circle cx="340" cy="91" r="7" fill="#10b981" />
        <circle cx="320" cy="78" r="7" fill="#38bdf8" />
        <!-- Bumpers -->
        <rect x="30" y="12" width="60" height="12" rx="4" fill="#334155" />
        <text x="60" y="21" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="9" text-anchor="middle">LB</text>
        <rect x="310" y="12" width="60" height="12" rx="4" fill="#334155" />
        <text x="340" y="21" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="9" text-anchor="middle">RB</text>
      </g>

      <!-- Dialogue Bottom -->
      <rect x="180" y="260" width="520" height="60" fill="#ffffff" rx="8" />
      <text x="440" y="296" fill="#0f172a" font-family="'Plus Jakarta Sans', sans-serif" font-weight="bold" font-size="18" text-anchor="middle">
        "Press RB to advance to next page, LB for previous!"
      </text>
    </g>

    <!-- Footer Page Number -->
    <text x="500" y="1420" fill="#475569" font-family="'JetBrains Mono', monospace" font-size="14" text-anchor="middle">- ${pageNumber} / 8 -</text>
  </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

const COMIC_PAGES: ComicPage[] = [
  { pageNumber: 1, title: 'AWAKENING', imageUrl: createMangaPageSvg(1, 'NEO SHIBUYA 2099', 'intro') },
  { pageNumber: 2, title: 'THE SIGNAL', imageUrl: createMangaPageSvg(2, 'FREQUENCY DETECTED', 'dialogue') },
  { pageNumber: 3, title: 'SPEED BREACH', imageUrl: createMangaPageSvg(3, 'HYPERSPEED ENGAGE', 'action') },
  { pageNumber: 4, title: 'GRID CLASH', imageUrl: createMangaPageSvg(4, 'SYSTEM OVERRIDE', 'action') },
  { pageNumber: 5, title: 'CONSOLE PROTOCOL', imageUrl: createMangaPageSvg(5, '4:3 & 16:9 SYNCHRONIZED', 'dialogue') },
  { pageNumber: 6, title: 'APEX POWER', imageUrl: createMangaPageSvg(6, 'DUAL TRIGGER UNLEASHED', 'climax') },
  { pageNumber: 7, title: 'DISTRACTION FREE', imageUrl: createMangaPageSvg(7, 'OLED BLACK MATRIX', 'dialogue') },
  { pageNumber: 8, title: 'TO BE CONTINUED', imageUrl: createMangaPageSvg(8, 'THE ODYSSEY AWAITS', 'intro') },
];

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
          <p>"There I object," said Filby. "Of course a solid body may exist. All real things—"</p>
          <p>"So most people think. But wait a moment. Can an instantaneous cube exist?"</p>
          <p>"Don't follow you," said Filby.</p>
          <p>"Can a cube that does not exist for any time at all, have any real existence?"</p>
          <p>Filby became pensive. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and—Duration."</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_2',
        title: 'Chapter II: The Machine Revealed',
        content: `
        <div class="space-y-4">
          <p>The thing the Time Traveller held in his hand was a glittering metallic framework, scarcely larger than a small clock, and very delicately made.</p>
          <p>There was ivory in it, and some transparent crystalline substance. And now I must be plain, for this that follows—unless his explanation is to be accepted—is an absolutely unaccountable thing.</p>
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
          <p>At last I stopped. I was in a lush green garden, surrounded by giant Rhododendrons and towering marble edifices under a radiant, warm sky. Before me stood a colossal figure sculpted in white stone—a winged Sphinx.</p>
        </div>
        `,
      },
      {
        id: 'tm_chap_4',
        title: 'Chapter IV: The Golden Age of Eloi',
        content: `
        <div class="space-y-4">
          <p>In another moment we were standing face to face, I and this fragile creature of the future.</p>
          <p>He was a slight thing, perhaps four feet high, clad in a purple tunic, girdled at the waist with a leather belt. Sandals or buskins—I could not clearly see which—were on his feet; his legs were bare to the knees, and his head was bare.</p>
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
          <p>Scattered everywhere across the plains were deep circular wells, each flanked by a bronze cover. From their depths came a steady, rhythmic thudding sound—the pulse of subterranean machinery.</p>
          <p>And then, in the pitch black shadows of a ruined gallery, I saw two eyes watching me—white, luminescent, and reflecting the light like the eyes of a cat.</p>
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
          <p>They swarmed over me in the dark, their cold, soft fingers clutching at my neck and boots. I struck a match—the blinding glare threw them back with shrill cries of pain.</p>
          <p>I leaped into the saddle of the Time Machine, slipped the nickel bars into their sockets, and pulled the lever!</p>
          <p>The sounds of the Morlocks ceased instantly. The suffocating darkness vanished. I had slipped once again into the boundless currents of time, hurtling forward across the dying eons of Earth.</p>
        </div>
        `,
      },
    ],
  },
  {
    id: 'sample_comic_cyberblade',
    title: 'Cyber Blade: Handheld Chronicle',
    author: 'Studio Handheld & Pixel Forge',
    format: 'cbz',
    description: 'An action-packed cyberpunk graphic novel specifically calibrated for handheld displays (16:9, 3:2, 4:3) with Manga RTL and Webtoon reading modes.',
    fileSize: '1.2 MB',
    totalChapters: 1,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 8,
    lastReadTimestamp: Date.now() - 1000 * 60 * 15,
    bookmarks: [1],
    comicPages: COMIC_PAGES,
  },
  {
    id: 'sample_txt_suntzu',
    title: 'The Art of War',
    author: 'Sun Tzu',
    format: 'txt',
    description: 'The definitive ancient military treatise on strategy, tactical positioning, deception, and conflict resolution.',
    fileSize: '85 KB',
    totalChapters: 5,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 5,
    lastReadTimestamp: Date.now() - 1000 * 60 * 120,
    bookmarks: [],
    chapters: [
      {
        id: 'tz_1',
        title: 'Chapter I: Laying Plans',
        content: `Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.

The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.

These are:
1. The Moral Law
2. Heaven (Climate and Seasons)
3. Earth (Terrain, Distances, Danger and Security)
4. The Commander (Wisdom, Sincerity, Benevolence, Courage, Strictness)
5. Method and Discipline

The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.

Heaven signifies night and day, cold and heat, times and seasons.

Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.

All warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.`,
      },
      {
        id: 'tz_2',
        title: 'Chapter II: Waging War',
        content: `Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men.

When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength.

Again, if the campaign is protracted, the resources of the State will not be equal to the strain.

Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue.

Thus, though we have heard of stupid haste in war, cleverness has never been seen associated with long delays. There is no instance of a country having benefited from prolonged warfare.`,
      },
      {
        id: 'tz_3',
        title: 'Chapter III: Attack by Stratagem',
        content: `Sun Tzu said: In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it, to capture a regiment, a detachment or a company entire than to destroy them.

Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting.

Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities.

If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.`,
      },
      {
        id: 'tz_4',
        title: 'Chapter IV: Tactical Dispositions',
        content: `Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy.

To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself.

Thus the good fighter is able to secure himself against defeat, but cannot make certain of defeating the enemy.

Security against defeat implies defensive tactics; ability to defeat the enemy means taking the offensive. Standing on the defensive indicates insufficient strength; attacking, a superabundance of strength.

The general who is skilled in defense hides in the most secret recesses of the earth; he who is skilled in attack flashes forth from the topmost heights of heaven. Thus on the one hand we have ability to protect ourselves; on the other, a victory that is complete.`,
      },
      {
        id: 'tz_5',
        title: 'Chapter V: Energy & Timing',
        content: `Sun Tzu said: The control of a large force is the same principle as the control of a few men: it is merely a question of dividing up their numbers.

Fighting with a large army under your command is nowise different from fighting with a small one: it is merely a question of instituting signs and signals.

To ensure that your whole host may withstand the brunt of the enemy's attack and remain unshaken—this is effected by maneuvers direct and indirect.

That the impact of your army may be like a grindstone dashed against an egg—this is effected by the science of weak points and strong.

In all fighting, the direct method may be used for joining battle, but indirect methods will be needed in order to secure victory. Indirect tactics, efficiently applied, are inexhaustible as Heaven and Earth, unending as the flow of rivers and streams; like the sun and moon, they end but to begin anew; like the four seasons, they pass away to return once more.`,
      },
    ],
  },
  {
    id: 'sample_pdf_handheld',
    title: 'Handheld Hardware & Aspect Ratio Guide',
    author: 'Retroid, Odin & Miyoo Technical Specs',
    format: 'pdf',
    description: 'Hardware architecture reference detailing 16:9, 3:2, and 4:3 display resolutions, D-pad ergonomics, OLED battery conservation, and gamepad controller polling.',
    fileSize: '310 KB',
    totalChapters: 4,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 4,
    lastReadTimestamp: Date.now() - 1000 * 60 * 60,
    bookmarks: [2],
    chapters: [
      {
        id: 'pdf_page_1',
        title: 'Section 1: Aspect Ratios in Modern Handhelds',
        content: `
        <div class="space-y-4">
          <div class="p-4 rounded-lg bg-sky-950/40 border border-sky-500/30">
            <h3 class="font-bold text-sky-400 text-lg mb-1">TECHNICAL REFERENCE // DOCUMENT ID: HH-SPEC-2026</h3>
            <p class="text-sm text-sky-200">Screen Geometry, Pixel Density, and Display Adaptation for Android Consoles</p>
          </div>
          <h2 class="text-xl font-bold">1. Display Aspect Ratio Standards</h2>
          <p>Android handheld gaming devices span a diverse spectrum of screen aspect ratios:</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
            <div class="p-3 rounded-md bg-neutral-900 border border-neutral-800">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">16:9 Widescreen</span>
              <p class="font-bold mt-2 text-sm">Odin 2, Retroid Pocket 4/5, Steam Deck</p>
              <p class="text-xs text-neutral-400 mt-1">1920x1080 / 1280x720. Ideal for modern manga double-spreads and widescreen EPUB reading.</p>
            </div>
            <div class="p-3 rounded-md bg-neutral-900 border border-neutral-800">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">3:2 Classic Pro</span>
              <p class="font-bold mt-2 text-sm">Anbernic RG552, GBA form factors</p>
              <p class="text-xs text-neutral-400 mt-1">1920x1152. Perfectly matches classic 35mm paper proportions, golden ratio for book typography.</p>
            </div>
            <div class="p-3 rounded-md bg-neutral-900 border border-neutral-800">
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">4:3 Retro Format</span>
              <p class="font-bold mt-2 text-sm">Miyoo Mini+, RG353V, Retroid 2S</p>
              <p class="text-xs text-neutral-400 mt-1">640x480 / 1024x768. Maximum vertical reading height per unit width, superb for single column novels.</p>
            </div>
          </div>
          <p>This application implements dynamic SVG and CSS viewport scaling to seamlessly eliminate black bars or letterboxing based on user configuration.</p>
        </div>
        `,
      },
      {
        id: 'pdf_page_2',
        title: 'Section 2: Gamepad Input Mapping & Latency',
        content: `
        <div class="space-y-4">
          <h2 class="text-xl font-bold">2. Gamepad API Polling Architecture</h2>
          <p>Handheld game consoles expose their physical controls via standard Linux kernel / Android HID drivers mapped to the Web Gamepad API standard:</p>
          <ul class="list-disc pl-5 space-y-2 text-sm">
            <li><strong>Shoulder Buttons (LB / RB):</strong> Bumper switches (indices 4 & 5) provide tactile micro-switch actuation, optimal for discrete next/previous page turns.</li>
            <li><strong>Analog Triggers (LT / RT):</strong> Pressure-sensitive triggers (indices 6 & 7) allow variable speed continuous scrolling or fast skip jumps.</li>
            <li><strong>Analog Thumbsticks:</strong> Dual hall-effect sticks provide analog axes with calibrated 25% deadzone to prevent accidental drift while holding the console.</li>
            <li><strong>Haptic Feedback:</strong> Standard dual-rumble vibration triggers provide tactile confirmation upon page turns.</li>
          </ul>
          <div class="p-3 bg-neutral-900 rounded border border-neutral-800 font-mono text-xs text-neutral-300">
            navigator.getGamepads()[0].vibrationActuator.playEffect("dual-rumble", {<br/>
            &nbsp;&nbsp;duration: 45,<br/>
            &nbsp;&nbsp;weakMagnitude: 0.4,<br/>
            &nbsp;&nbsp;strongMagnitude: 0.2<br/>
            });
          </div>
        </div>
        `,
      },
      {
        id: 'pdf_page_3',
        title: 'Section 3: OLED Battery Life & Thermal Management',
        content: `
        <div class="space-y-4">
          <h2 class="text-xl font-bold">3. OLED Power Conservation</h2>
          <p>Handheld devices equipped with AMOLED displays (e.g. Odin 2 Portal, Retroid Pocket 5, PS Vita, Switch OLED) draw power proportionally to active pixel luminance.</p>
          <div class="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <h4 class="font-bold text-emerald-400 mb-2">True OLED Black Mode (#000000)</h4>
            <p class="text-sm text-neutral-300">By rendering the reading background in true #000000 black, up to 92% of the panel's subpixels are completely powered down. This extends handheld reading session endurance from ~6 hours to over 18+ hours on a single 5000mAh battery charge.</p>
          </div>
          <p class="text-sm text-neutral-400">Distraction-Free mode further suppresses background UI redrawing, capping GPU power draw to less than 0.8 Watts during static text viewing.</p>
        </div>
        `,
      },
      {
        id: 'pdf_page_4',
        title: 'Section 4: Format Decoding Specifications',
        content: `
        <div class="space-y-4">
          <h2 class="text-xl font-bold">4. Client-Side Format Pipelines</h2>
          <p>All parsing is executed locally inside the browser / WebView sandboxed environment:</p>
          <div class="space-y-2 text-sm">
            <p>• <strong>EPUB:</strong> ZIP uncompressing + OPF manifest reading + XHTML DOM normalization.</p>
            <p>• <strong>CBZ / Comic:</strong> Indexed image archive extraction with zero-latency blob URL caching.</p>
            <p>• <strong>MOBI / AZW:</strong> PalmDOC header extraction with LZ77 run-length decompression.</p>
            <p>• <strong>TXT:</strong> Automatic heading heuristics and chapter chunking.</p>
            <p>• <strong>PDF:</strong> High-DPI canvas render pipeline with page navigation.</p>
          </div>
        </div>
        `,
      },
    ],
  },
  {
    id: 'sample_mobi_journey',
    title: 'Journey to the Center of the Earth',
    author: 'Jules Verne',
    format: 'mobi',
    description: 'Classic PalmDOC/Kindle adventure novel following Professor Lidenbrock, his nephew Axel, and their guide Hans down Icelandic volcanic tubes.',
    fileSize: '512 KB',
    totalChapters: 4,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 4,
    lastReadTimestamp: Date.now() - 1000 * 60 * 240,
    bookmarks: [],
    chapters: [
      {
        id: 'jb_1',
        title: 'Chapter 1: The Runic Manuscript',
        content: `Looking back to all that has occurred to me since that eventful day, I am scarcely able to believe in the reality of my adventures. They were truly so wonderful that even now I am bewildered when I think of them.

My uncle was a German, having married my mother's sister, an Englishwoman. Being very fond of me, he invited me to come and live with him at Hamburg, where he held the professorship of mineralogy in the university.

One day, he rushed into his study with a rare Icelandic manuscript written in runes:
"Axel, look here! A book by Snorri Sturluson, the famous Icelandic author of the twelfth century!"

As he shook the parchment, a folded slip of yellowed paper fluttered to the floor. Upon it were inscribed mysterious runic cryptograms.`,
      },
      {
        id: 'jb_2',
        title: 'Chapter 2: The Cryptogram Deciphered',
        content: `For two days my uncle refused to eat or sleep until the cipher was broken. In a sudden flash of inspiration while fanning myself with the parchment, I read the Latin backward:

"Descend, bold traveller, into the crater of the jokul of Sneffels, which the shadow of Scartaris caresses before the calends of July, and you will reach the centre of the earth. I have done it. Arne Saknussemm."

My uncle let out a roar of triumph that shook the house! "Axel, pack our bags, our compasses, and our pickaxes! We set out for Iceland at dawn!"`,
      },
      {
        id: 'jb_3',
        title: 'Chapter 3: The Chimney of Sneffels',
        content: `Mount Sneffels was a dormant volcano rising five thousand feet into the Arctic sky. Accompanied by our unflappable Icelandic guide, Hans Bjelke, we reached the lip of the crater.

Looking down into the vertical volcanic chimney was like peering into the throat of an infinite abyss.

Hans tied our heavy ropes around a basalt spire. One by one, we lowered our bodies into the darkness of the subterranean earth. The light of the sun dwindled to a tiny blue star, and then vanished. We turned on our Ruhmkorff electric lanterns.`,
      },
      {
        id: 'jb_4',
        title: 'Chapter 4: The Central Ocean & Giant Mushrooms',
        content: `After weeks of subterranean descent, the narrow tunnels suddenly opened out into an immense cavern—a subterranean sea stretching beyond the horizon under an electrified luminous sky!

On the shores of this Central Sea grew forests of giant mushrooms, forty feet high, their caps sprawling like colossal umbrellas.

Skeletal remains of mastodons and prehistoric reptiles littered the quartz sand. In the distance, two gargantuan serpents—an Ichthyosaurus and a Plesiosaurus—rose from the stormy subterranean waves locked in mortal combat!`,
      },
    ],
  },
];
