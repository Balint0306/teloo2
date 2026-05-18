export interface Track {
  id: number;
  title: string;
  artist: string;
  cover: string;
  videoUrl: string;
  color: string;
  lyrics?: { time: number; text: string }[];
}

export const SPOTIFY_TRACKS: Track[] = [
  { 
    id: 1, 
    title: 'After Hours', 
    artist: 'The Weeknd', 
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400', 
    videoUrl: 'https://cdn.pixabay.com/vimeo/328941011/music-22920.mp4?width=1280&hash=d3e0e7a2e0e7a2a2e0e7a2a2e0e7a2a2e0e7a2a2',
    color: '#f97316',
    lyrics: [
      { time: 0, text: "Thought I almost died in my dream" },
      { time: 4, text: "Fighting for my life, I couldn't breathe" },
      { time: 8, text: "I fell into it" },
      { time: 12, text: "I fell into it" }
    ]
  },
  { 
    id: 2, 
    title: 'Future Nostalgia', 
    artist: 'Dua Lipa', 
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400', 
    videoUrl: 'https://cdn.pixabay.com/vimeo/328941011/music-22920.mp4?width=640&hash=d3e0e7a2e7a2a2e0e7a2a2e0e7a2a2e0e7a2a2',
    color: '#3b82f6' 
  },
  { 
    id: 3, 
    title: 'STAY', 
    artist: 'The Kid LAROI', 
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/04/79/10/35/700_F_479103576_q7p9j3yv5Qp5pXy8x9y0y1u2A3B4C5D6_ST.mp4',
    color: '#a855f7' 
  },
  { 
    id: 4, 
    title: 'Solar Power', 
    artist: 'Lorde', 
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/03/61/15/87/700_F_361158756_EwXbZcR8L9K0E4o5R6A7p8O9L0X1Y2Z3_ST.mp4',
    color: '#ec4899' 
  },
  { 
    id: 5, 
    title: 'Save Your Tears', 
    artist: 'The Weeknd', 
    cover: 'https://images.unsplash.com/photo-1459749411177-042180ceea72?q=80&w=400', 
    videoUrl: 'https://cdn.pixabay.com/vimeo/328941011/music-22920.mp4?width=1280&hash=d3e0e7a2e0e7a2a2e0e7a2a2e0e7a2a2e0e7a2a2',
    color: '#27272a' 
  },
  { 
    id: 6, 
    title: 'Peaches', 
    artist: 'Justin Bieber', 
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/03/61/15/87/700_F_361158756_EwXbZcR8L9K0E4o5R6A7p8O9L0X1Y2Z3_ST.mp4',
    color: '#ef4444' 
  },
  { 
    id: 7, 
    title: 'Levitating', 
    artist: 'Dua Lipa', 
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/04/79/10/35/700_F_479103576_q7p9j3yv5Qp5pXy8x9y0y1u2A3B4C5D6_ST.mp4',
    color: '#10b981' 
  },
  { 
    id: 8, 
    title: 'Blinding Lights', 
    artist: 'The Weeknd', 
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400', 
    videoUrl: 'https://cdn.pixabay.com/vimeo/328941011/music-22920.mp4?width=640&hash=d3e0e7a2e7a2a2e0e7a2a2e0e7a2a2e0e7a2a2',
    color: '#f59e0b' 
  },
  { 
    id: 9, 
    title: 'Mióta elhagytál (Nem vagyok álmos)', 
    artist: 'BSW', 
    cover: 'https://i.scdn.co/image/ab67616d0000b273586d42f31bf6fb8b8006ee29', 
    videoUrl: 'https://www.dropbox.com/scl/fi/9n642b1i715j5xbge6nrb/BSW-Mi-ta-elhagyt-l-Nem-vagyok-lmos.mp4?rlkey=s9s1oqmfupwh63awib64d04mg&st=lwvdqvto&raw=1',
    color: '#1a1a1a',
lyrics: [
  { time: 13, text: "Ma kicsit meghalok, de kelek holnap, eltelt ezer hónap" },
  { time: 18, text: "Felriadok, még mindig álmodok rólad, álmodok rólad..." },
  { time: 24, text: "És rád gondolok, nem tudom hol vagy, nem hallok már rólad" },
  { time: 29, text: "Nem haragszom Rád már, én remélem jól vagy, remélem jól vagy..." },
  { time: 34, text: "És azt mutatom, hogy minden oké-oké, de mikor éjszaka senki se lát" },
  { time: 40, text: "Utamon a múlt követ, és én csak menekülök egyedül a városon át" },
  { time: 45, text: "És tudom nem szabadulok meg tőlünk: túl sok a szép emlék" },
  { time: 51, text: "Egy kicsit nézlek még, és megöl ez az ébrenlét..." },
  { time: 56, text: "Mióta elhagytál nem vagyok álmos, csak járom az éjszakát" },
  { time: 61, text: "Mióta nem vagy már üres a város, gondolok néha Rád" },
  { time: 67, text: "Hazudok, hogy minden rendben, pedig megfagyott minden bennem" },
  { time: 72, text: "És nem bírom a súlyát, pupillám túl tág" },
  { time: 75, text: "Amin bejön a sok emlékkép, nemrég még" },
  { time: 79, text: "Úgy volt minden, mint egy filmben, ó és ez ketté tép" },
  { time: 85, text: "Amin bejön a sok emlékkép, nemrég még" },
  { time: 91, text: "Úgy volt minden, mint egy filmben, ó és ez ketté tép..." },
  { time: 97, text: "Mindig felriadok éjjel, mindig álmodok rólunk" },
  { time: 101, text: "Ahogy együtt vagyunk, veszekedünk, lever a víz" },
  { time: 104, text: "És arra ébredek fel, hogy tiszta vizes az ágyam" },
  { time: 108, text: "Megint egyedül maradtam - meddig lesz ez még így?" },
  { time: 111, text: "De senki! Senki nem jött úgy, mint Te" },
  { time: 114, text: "Senkit nem szerettem így, senki nem fogott így meg" },
  { time: 117, text: "És talán soha nem is fogok és én ezt is elfogadom" },
  { time: 120, text: "Csak már nem akarom ezt, mert én nem bírom ezt" },
  { time: 124, text: "Azt hittem, hogy már jól vagyok, kérdezem, hol vagyok..." },
  { time: 127, text: "Mert csak visz ez a Bentley, ha nem figyelek pont" },
  { time: 130, text: "Amikor hazafele megyek, odakanyarodok" },
  { time: 133, text: "Kívülről nézem a házat, baszki, miért vagyok itt?!" },
  { time: 136, text: "Hát én már nem is itt lakom - én már elköltöztem rég!" },
  { time: 139, text: "Úgy tűnik, nem fogtam fel, talán itt ragadtál benn" },
  { time: 142, text: "És ide hoz el az éj, hiába telt ezer év..." },
  { time: 145, text: "Mióta elhagytál nem vagyok álmos, csak járom az éjszakát" },
  { time: 150, text: "Mióta nem vagy már üres a város, gondolok néha Rád" },
  { time: 155, text: "Hazudok, hogy minden rendben, pedig megfagyott minden bennem" },
  { time: 161, text: "És nem bírom a súlyát, pupillám túl tág" },
  { time: 164, text: "Amin bejön a sok emlékkép, nemrég még" },
  { time: 168, text: "Úgy volt minden, mint egy filmben, ó és ez ketté tép" },
  { time: 174, text: "Amin bejön a sok emlékkép, nemrég még" },
  { time: 180, text: "Úgy volt minden, mint egy filmben, ó és ez ketté tép..." }
]
  },
  { 
    id: 10, 
    title: 'YAAY', 
    artist: 'BSW', 
    cover: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/04/79/10/35/700_F_479103576_q7p9j3yv5Qp5pXy8x9y0y1u2A3B4C5D6_ST.mp4',
    color: '#eab308' 
  },
  { 
    id: 11, 
    title: 'Gucci', 
    artist: 'BSW', 
    cover: 'https://images.unsplash.com/photo-1621272036047-bb0f76bbc1ad?q=80&w=400', 
    videoUrl: 'https://v.ftcdn.net/03/61/15/87/700_F_361158756_EwXbZcR8L9K0E4o5R6A7p8O9L0X1Y2Z3_ST.mp4',
    color: '#10b981' 
  },
  { 
    id: 12, 
    title: 'Még egyszer', 
    artist: 'BSW', 
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400', 
    videoUrl: 'https://cdn.pixabay.com/vimeo/328941011/music-22920.mp4?width=640',
    color: '#8b5cf6' 
  }
];
