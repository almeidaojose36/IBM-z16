// Narration script. Each beat is one voice-over clip; visuals in src/story.js are keyed to beat ids,
// so the edit follows the recorded audio. `pause` is silence after the beat in seconds (default 0.8);
// `hold` is extra silent time for an animation to play out.
// Facts are from the IBM z16 (3931) Technical Guide and Technical Introduction; see docs/RESEARCH.md.
export const TITLE = 'How Does a Mainframe Work? Inside the IBM z16';

export const CHAPTERS = [
  { id: 'hook', title: null, beats: [
    { id: 'h1', text: 'You tap a card on a reader. About a second later, one word appears. Approved.', pause: 0.8 },
    { id: 'h2', text: 'In that second, your payment was encrypted, sent across the country, checked against your balance, scored for fraud by a neural network, and written into a ledger that is never allowed to lose it.' },
    { id: 'h3', text: 'Machines like this one sit behind much of the world\'s banking. This is an IBM z16. A mainframe.', pause: 0.7 },
    { id: 'h3b', text: 'The name comes from the big metal frames that held the earliest computers. Sixty years later, the idea is the same. One very large, very reliable computer at the center of a business, shared by everyone.' },
    { id: 'h4', text: 'It costs upwards of a million dollars. A single frame can weigh almost eight hundred kilograms. And it is built around one idea: it must never stop.' },
    { id: 'h5', text: 'So today, we take it apart. Every drawer, every card, every chip, all the way down to a single transistor. And as we go, we will follow that one payment through the machine.', pause: 1.6, hold: 2.5 },
  ] },

  { id: 'frame', title: 'The Frame', beats: [
    { id: 'f1', text: 'From the outside, a z16 looks like a sculpture. Four angular panels, a strip of blue light. But under the covers, it is something very familiar.' },
    { id: 'f2', text: 'It is a standard nineteen inch rack, forty-two units tall. The same format used by almost every server in a data center.' },
    { id: 'f2b', text: 'That choice is recent. For decades, mainframes were custom built cabinets that needed special floors, and often chilled water from the building. This one rolls into an ordinary data center aisle.' },
    { id: 'f3', text: 'A small system is one frame. A big one bolts up to four together, side by side, and runs them as a single computer.', pause: 0.7, hold: 1.5 },
    { id: 'f4', text: 'Let\'s take the covers off, and look at what is inside the first frame.', pause: 0.8, hold: 2.5 },
    { id: 'f5', text: 'At the very top sit two support elements. These are small servers whose only job is to manage the mainframe. There are two, because there are two of almost everything.' },
    { id: 'f5b', text: 'If something does go wrong, the support elements notice first. They log it, work out which part has failed, and can call for a replacement before anyone on site has seen a warning light.' },
    { id: 'f6', text: 'Below them, two network switches connect every part of the machine to those support elements.' },
    { id: 'f7', text: 'Then comes an input output drawer. This is how the mainframe talks to the outside world.' },
    { id: 'f8', text: 'Under that, the processor drawers. Each one is a complete computer on its own, with processors, memory, power and cooling. This frame holds three.' },
    { id: 'f8b', text: 'A processor drawer on its own would already be a serious server. It has sixty-four processor cores, and room for ten terabytes of memory.' },
    { id: 'f9', text: 'And at the bottom, a radiator. We will come back to that, because this machine is water cooled.' },
    { id: 'f9b', text: 'Everything in here is mounted on rails. Nothing is wired in permanently. That detail will matter later.', pause: 1.2, hold: 1.5 },
  ] },

  { id: 'io', title: 'The Way In', beats: [
    { id: 'i1', text: 'Now, back to our payment. It arrives as light, in a fiber optic cable.' },
    { id: 'i1b', text: 'A payment network has routed it to your bank\'s data center, and to a port on the back of this machine.' },
    { id: 'i2', text: 'Every cable on a z16 connects at the back. Power, networking, storage, even the cooling water. The front stays clear, so that parts can be pulled out for service.' },
    { id: 'i2b', text: 'Look closely, and you can see blue fiber for data, thick cables that tie the drawers together, and red and blue hoses for the water loop.' },
    { id: 'i3', text: 'The fiber plugs into a network card in the input output drawer. Each drawer holds sixteen cards, lying flat, in two columns.' },
    { id: 'i4', text: 'And the cards are not all the same. Network cards carry transactions in and out. Storage cards connect to disk systems at up to thirty-two gigabits per second. Coupling cards link this mainframe to another one, up to ten kilometers away, so that two machines can share the work.' },
    { id: 'i5', text: 'The drawer is split into two independent halves, called domains. Each half has its own path to the processors. If one path fails, the other carries on.' },
    { id: 'i5b', text: 'Each half has a switch card, which gathers the traffic from its eight cards, and sends it down a cable to a processor drawer.' },
    { id: 'i6', text: 'A large z16 can have twelve of these drawers. That is one hundred and ninety-two cards. A mainframe is not built to do one calculation quickly. It is built to move enormous amounts of data, all the time, for thousands of users at once.', pause: 1.2, hold: 1.5 },
  ] },

  { id: 'crypto', title: 'The Vault', beats: [
    { id: 'c1', text: 'But before our payment goes anywhere, it has a problem. It is encrypted, and it has to be checked.' },
    { id: 'c2', text: 'That is the job of this card. It is called a Crypto Express, and inside it is a hardware security module. Think of it as a vault for encryption keys.', hold: 1.5 },
    { id: 'c2b', text: 'Encrypting and decrypting is constant work on a mainframe. Simple cases are handled inside the processor itself. But the most sensitive keys, the ones that protect the bank, are kept here.' },
    { id: 'c3', text: 'The module sits in a sealed enclosure that senses tampering. Any attempt to open it or probe it, and it destroys every key it holds. The keys never leave the card. Not even the operating system can read them.' },
    { id: 'c4', text: 'It is also designed for a threat that does not fully exist yet. A future quantum computer could break much of today\'s encryption. So attackers can copy encrypted data now, and wait. The z16 supports quantum safe algorithms, built to resist that.', pause: 1.2 },
  ] },

  { id: 'drawer', title: 'The Processor Drawer', beats: [
    { id: 'd1', text: 'With its keys verified, the payment travels down a cable to where the real work happens. The processor drawer.' },
    { id: 'd2', text: 'Let\'s pull one out. It is five rack units tall, and packed solid from front to back.', pause: 0.6, hold: 2.5 },
    { id: 'd3', text: 'Take off the cover, and you can read the layout from front to back.', hold: 1.5 },
    { id: 'd4', text: 'At the front, five fans push air through the drawer.' },
    { id: 'd5', text: 'Behind them, memory. Forty-eight slots.' },
    { id: 'd6', text: 'Then four processor modules, hidden under copper cold plates and a web of water hoses.' },
    { id: 'd7', text: 'And at the back, twelve fanout cards. These are the cables that run to the input output drawers.' },
    { id: 'd7b', text: 'Two small control cards at the front watch the voltages, temperatures and fan speeds in the drawer, and report to the support elements at the top of the frame.' },
    { id: 'd8', text: 'Now watch what happens when we pull it apart. Almost everything slides out on its own. Fans. Power supplies. Control cards.', hold: 2.0 },
    { id: 'd9', text: 'That is deliberate. There are four power supplies, but the drawer can run on three. Five fans, but it can run on four. Engineers call this N plus one. Whatever you need, you install one more.' },
    { id: 'd10', text: 'So when a part fails, the machine keeps running. A technician slides out the broken one, slides in a new one, and the payment in flight never notices.' },
    { id: 'd11', text: 'Even the clock is doubled. Every processor needs a steady beat to work by. This drawer has two oscillator cards. If the first one fails, the second takes over without missing a tick.', pause: 1.2, hold: 1.0 },
  ] },

  { id: 'power', title: 'Power', beats: [
    { id: 'pw1', text: 'None of this runs without power, and a mainframe is careful with it. Thick three phase cords come in at the back of each frame, and feed power distribution units mounted on the sides.' },
    { id: 'pw2', text: 'They come in pairs, on separate feeds. If the building loses one feed, the other carries the whole frame.' },
    { id: 'pw3', text: 'Each drawer\'s power supplies turn that into twelve volts. But a processor needs a much lower voltage, and a great deal of current. So the last step happens right beside the chips, on small regulator cards that stand between the memory modules.' },
    { id: 'pw4', text: 'Even these are spared. There are more regulators than the drawer needs, so one can fail, and nothing changes.', pause: 1.2 },
  ] },

  { id: 'memory', title: 'Memory That Heals', beats: [
    { id: 'm1', text: 'Our payment needs your account balance, and that lives in memory.' },
    { id: 'm2', text: 'One drawer can hold up to ten terabytes of it. A full system, forty terabytes. Enough to keep entire databases in memory, instead of on disk.' },
    { id: 'm2b', text: 'The modules are packed in two rows across the width of the drawer, cooled by the air from those five fans.' },
    { id: 'm3', text: 'But memory chips fail. Not often, but with this many, it will happen. In an ordinary computer, a failed memory module means a crash.' },
    { id: 'm4', text: 'Here, the modules work in groups of eight. Every piece of data is spread across all eight, along with extra information for error correction.' },
    { id: 'm5', text: 'So if one bit flips, it is corrected. If a whole chip dies, it is corrected. If an entire module fails, the other seven rebuild its data on the fly, and the system keeps running.', hold: 1.5 },
    { id: 'm6', text: 'IBM calls it a redundant array of independent memory. It is the same idea that protects hard drives, applied to memory. And everything stored here is encrypted, too.', pause: 1.2 },
  ] },

  { id: 'cooling', title: 'Water', beats: [
    { id: 'w1', text: 'All of this work makes heat, and most of it comes from the processors. Too much for air alone.' },
    { id: 'w1b', text: 'A processor drawer under full load turns kilowatts of electricity into heat, in a space the size of a suitcase.' },
    { id: 'w2', text: 'So each processor module wears a copper cold plate. Cool water flows in through one hose, across the plate, and out through another, carrying the heat away.' },
    { id: 'w3', text: 'The hoses join a manifold, and leave through a single quick connector at the back of the drawer.', hold: 1.0 },
    { id: 'w4', text: 'From there, the warm water runs down to the radiator at the bottom of the frame.' },
    { id: 'w5', text: 'Inside are two pumps. One is enough. The water passes through a heat exchanger, a block of thin metal fins, while fans blow room air across it. Then, cool again, it goes back up to the processors.', hold: 2.0 },
    { id: 'w6', text: 'It is a closed loop. The same water goes around and around. The mainframe needs no plumbing from the building. Just air.' },
    { id: 'w6b', text: 'If a pump or a fan fails, its twin takes the full load, and it can be replaced while the machine runs.', pause: 1.2 },
  ] },

  { id: 'module', title: 'The Module', beats: [
    { id: 'p1', text: 'Lift the cold plates away, and here it is. The reason this machine exists.', hold: 2.0 },
    { id: 'p2', text: 'This is a dual chip module. It is about the size of a drink coaster, and on its underside are four thousand, seven hundred and fifty-three contacts.' },
    { id: 'p2b', text: 'The module presses into a socket on the main board, and a steel frame clamps it down, so that every one of those contacts touches.' },
    { id: 'p3', text: 'Under the metal cap are two processors, side by side. Each one is called Telum.', hold: 1.5 },
    { id: 'p3b', text: 'They share the cap, the cold plate, and a direct link between them.', pause: 0.6 },
    { id: 'p4', text: 'Four modules in a drawer. Two chips in each. That makes eight processors working together, and our payment is about to land on one of them.', pause: 1.2 },
  ] },

  { id: 'telum', title: 'Telum', beats: [
    { id: 't1', text: 'A single Telum chip is five hundred and thirty square millimeters of silicon, carrying twenty-two and a half billion transistors.', hold: 1.0 },
    { id: 't2', text: 'Most of what you see is laid out in a grid. Eight cores. These are the parts that actually run programs.' },
    { id: 't3', text: 'Each core runs at five point two gigahertz. That is more than five billion steps every second. That is among the fastest clocks of any processor, and this one holds it all day, every day, for years.' },
    { id: 't3b', text: 'In the time one of those steps takes, a beam of light travels less than six centimeters.' },
    { id: 't4', text: 'A core does not run instructions one at a time, in order. It looks ahead, works on many at once, and runs them out of order, whenever their data is ready. Then it puts the results back in sequence.' },
    { id: 't4b', text: 'Each core can also run two threads at once, switching between them whenever one is waiting, so no time is wasted.' },
    { id: 't5', text: 'Beside every core is a large block of cache. Thirty-two megabytes of very fast memory that belongs to that core. Your account balance is copied here, so the core does not have to wait.' },
    { id: 't6', text: 'And here is something clever. When a core is not using all of its cache, its neighbors can borrow the space. Together, the eight caches act as one shared pool for the whole chip, and then for the whole drawer.' },
    { id: 't7', text: 'The cores have some unusual skills. They can do arithmetic in decimal, the way money works, with no rounding errors from converting to binary. And each one has its own helper for compression and encryption.' },
    { id: 't8', text: 'There is also a part of every core that does nothing but watch. It keeps a copy of the core\'s complete state. If it detects a fault, the core stops, rolls back, and tries the instruction again.' },
    { id: 't9', text: 'And if the core is truly broken, its work is moved to a spare core, which picks up exactly where it left off. The program never knows.', pause: 1.2 },
  ] },

  { id: 'transistor', title: 'The Switch', beats: [
    { id: 'x1', text: 'Let\'s go deeper. Zoom into a core, far past what any light microscope can show, and you find the same tiny structure, repeated billions of times. A transistor.', hold: 2.0 },
    { id: 'x2', text: 'It is a switch. A thin fin of silicon stands up from the surface of the chip, and a gate wraps over it on three sides.' },
    { id: 'x3', text: 'Put a voltage on the gate, and electrons flow through the fin. The switch is on. Remove the voltage, and they stop. On, off. One, zero.', hold: 1.5 },
    { id: 'x4', text: 'Wrapping the gate around the fin gives it a tight grip on the current, so the switch can be made very small, and still turn off completely. Telum is built in a seven nanometer process. Thousands of these fins would fit across the width of a human hair.' },
    { id: 'x4b', text: 'And they are built in layers. Above the transistors sit more than a dozen levels of copper wiring, connecting them into circuits.' },
    { id: 'x5', text: 'Everything this machine does, every balance, every fraud score, every encrypted key, is these switches turning on and off, billions of times a second.', pause: 1.2 },
  ] },

  { id: 'ai', title: 'The Fraud Check', beats: [
    { id: 'a1', text: 'So a core has our payment. It knows your balance. But one question is left. Is it really you?' },
    { id: 'a2', text: 'Banks answer that with a neural network. It looks at the amount, the place, the time, and your history, and it produces a score. In the past, that model ran on a separate system, and there was often not enough time to ask it about every payment.' },
    { id: 'a2b', text: 'And it matters, because fraud is a race. The decision has to be made before the word approved appears. Not after.' },
    { id: 'a3', text: 'Telum changes that. In one corner of the chip is an accelerator built only for artificial intelligence. It is shared by all eight cores.' },
    { id: 'a4', text: 'The core hands over the details of the payment. The accelerator runs the model, and returns a score, without the data ever leaving the chip. It takes a tiny fraction of the second we have.', hold: 1.5 },
    { id: 'a5', text: 'So every payment can be checked while it is happening. Not afterward. The score comes back low. This one is really you.', pause: 1.2 },
  ] },

  { id: 'scale', title: 'One Computer', beats: [
    { id: 's1', text: 'One chip is powerful. But a bank does not process one payment. It processes thousands every second. So the chips have to work as a team.' },
    { id: 's2', text: 'Inside a module, the two chips are joined by a link called the M bus.' },
    { id: 's3', text: 'Across the drawer, every chip connects directly to the others over the X bus. Eight chips, sixty-four cores, all sharing one memory.', hold: 1.5 },
    { id: 's4', text: 'And at the back of the drawer, thick cables carry the A bus to the other drawers. Every drawer is wired to every other drawer, and each link is doubled.' },
    { id: 's4b', text: 'The chips do not take turns. All of them can reach all of the memory, so a job can run on any core, in any drawer.' },
    { id: 's5', text: 'With four drawers, that is two hundred and fifty-six cores. Up to two hundred of them run the customer\'s work. The rest run the machine itself, or wait in reserve as spares.', hold: 2.0 },
    { id: 's6', text: 'And all of it behaves as a single computer. One that can be divided into as many as eighty-five separate, isolated systems, each running its own operating system, side by side.' },
    { id: 's6b', text: 'The software that does this dividing is built into the machine itself, and it has been refined for decades.' },
    { id: 's7', text: 'A bank might run its ledger on one, its fraud models on another, and hundreds of Linux servers on a third. If one of them crashes, the others are untouched.', pause: 1.2 },
  ] },

  { id: 'never', title: 'Never Stop', beats: [
    { id: 'r1', text: 'Step back, and a pattern appears. Two support elements. Two switches. Two oscillators. Two pumps. Spare power supplies, spare fans, spare cores. Memory that rebuilds itself.' },
    { id: 'r1b', text: 'And the parts that are doubled are also watched. Sensors track temperature, humidity, and even air pressure. There are three of each, so that one faulty sensor cannot fool the system.' },
    { id: 'r2', text: 'Nothing in this machine is allowed to be the only one of its kind.' },
    { id: 'r3', text: 'It goes further. With more than one processor drawer, an entire drawer can be taken out for repair while the system is running. Its work moves to the others.', hold: 2.0 },
    { id: 'r3b', text: 'And two mainframes in different buildings can be coupled together, so that even losing a whole data center does not stop the work.' },
    { id: 'r4', text: 'That is what a mainframe really is. Not the fastest computer. The one that is still running.', pause: 1.2 },
  ] },

  { id: 'close', title: 'Approved', beats: [
    { id: 'z1', text: 'So let\'s finish our payment. The core subtracts the amount from your balance, in decimal. The change is written to memory, and then out through a storage card to disk, where it is safe.' },
    { id: 'z2', text: 'The answer is encrypted, handed to a network card, and sent back down the fiber as light.' },
    { id: 'z3', text: 'And about a second after you tapped your card, the reader shows one word.', pause: 1.2, hold: 2.5 },
    { id: 'z4', text: 'Behind that word are four frames, twelve drawers of cards, two hundred cores, forty terabytes of memory, and a closed loop of water. All built so that it happens every time.', hold: 2.0 },
    { id: 'z5', text: 'If you enjoyed this teardown, subscribe, and tell us in the comments which machine we should take apart next. Thanks for watching.', pause: 2.5 },
  ] },
];
