"""Clean, hand-selected public-domain books organized by emotion folder categories.

- High Stress: Books that make people calm
- Elevated Stress: Books that make people feel normal / grounded
- Normal: Books that make people happy
- Physically Active: Rom-Com / Romantic Comedy books
- Recovery: Books that make people laugh / Comedy
"""
from story_selector import recommend

CATALOG = {
    "high_stress": [
        {
            "id": "hs_1",
            "title": "The Wind in the Willows",
            "author": "Kenneth Grahame",
            "category": "High Stress",
            "kind": "Calming Classic",
            "cover": "https://www.gutenberg.org/cache/epub/289/pg289.cover.medium.jpg",
            "description": "A soothing riverside journey filled with unhurried friendship, gentle nature, and serene peace that lowers heart rate and brings instant calm.",
            "text": "The Mole had been working very hard all the morning, spring-cleaning his little home. First with brooms, then with dusters; then on ladders and steps and chairs, with a brush and a pail of whitewash; till he had dust in his throat and eyes, and splashes of whitewash all over his black fur, and an aching back and weary arms. Spring was moving in the air above and in the earth below and around him, penetrating even his dark and lowly little house with its spirit of divine discontent and longing. It was small wonder, then, that he suddenly flung down his brush on the floor, said 'Bother!' and 'O blow!' and also 'Hang spring-cleaning!' and bolted out of the house without even waiting to put on his coat. Something up above was calling him imperiously, and he made for the steep little tunnel which answered in his case to the gravelled carriage-drive of animals whose residences are nearer to the sun and air. So he scraped and scratched and scrabbled and scrooged, and then he scrooged again and scrabbled and scratched and scraped, working busily with his little paws and muttering to himself, 'Up we go! Up we go!' till at last, pop! his snout came out into the sunlight, and he found himself rolling in the warm grass of a great meadow. 'This is fine!' he said to himself. 'This is better than whitewashing!' The sunshine warmed his fur, the soft breezes caressed his heated brow, and after the seclusion of the cellar he had lived in so long, the carol of happy birds fell on his dulled hearing almost like a shout. Jumping off all four legs at once, in the joy of living and the delight of Spring without its cleaning, he pursued his way across the meadow, till he reached the hedge on the further side. 'Hold up!' said an elderly rabbit at the gap. 'Sixpence for the privilege of passing by the private road!' He was bowled over in an instant by the impatient and careless Mole, who trotted along the side of the hedge enjoying the peaceful quiet of the morning."
        },
        {
            "id": "hs_2",
            "title": "Walden",
            "author": "Henry David Thoreau",
            "category": "High Stress",
            "kind": "Mindful Solitude",
            "cover": "https://www.gutenberg.org/cache/epub/205/pg205.cover.medium.jpg",
            "description": "Deeply reflective observations on quiet nature, breathing room, and slowing down life to quiet an anxious mind.",
            "text": "When I wrote the following pages, I lived alone in the woods, on the shore of Walden Pond, in Concord, Massachusetts, and earned my living by the labor of my hands only. I lived there two years and two months. At present I am a sojourner in civilized life again. I should not obtrude my affairs so much on the notice of my readers if very particular inquiries had not been made by my townsmen concerning my mode of life. Some have asked what I got to eat; if I did not feel lonesome; if I was not afraid; and the like. I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived. I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary. I wanted to live deep and suck out all the marrow of life, to live so sturdily and Spartan-like as to put to rout all that was not life. Let us spend one day as deliberately as Nature, and not be thrown off the track by every nutshell and mosquito's wing that falls on the rails. Let us rise early and fast, or break fast, gently and without perturbation; let company come and let company go, let the bells ring and the children cry—determined to make a day of it."
        },
        {
            "id": "hs_3",
            "title": "The Secret Garden",
            "author": "Frances Hodgson Burnett",
            "category": "High Stress",
            "kind": "Restorative Nature",
            "cover": "https://www.gutenberg.org/cache/epub/17396/pg17396.cover.medium.jpg",
            "description": "A healing tale of green gardens, fresh fresh breeze, and steady quiet recovery from inner tension.",
            "text": "At first each day which passed by for Mary Lennox was exactly like the others. Every morning she awoke in her tapestried room and found Martha standing by the hearth buildng the fire. But as the fresh air from the moor blew through the open window, something began to change inside her. One of the strange things about living in the country is that when you sit quietly under a tree, the quietness enters into you. Mary sat down on the grass under a great tree and looked up into the green branches. The robin hopped near her on the brown earth, chirping softly as if telling her secrets of the soil. The sun was warm and the smell of the damp earth was sweet and wholesome. She took a deep breath of the pine-scented air, and for the first time in her life she felt her shoulders drop and her restless thoughts grow peaceful. The garden was keeping its secret, but it was giving her peace."
        }
    ],
    "elevated": [
        {
            "id": "el_1",
            "title": "Anne of Green Gables",
            "author": "L. M. Montgomery",
            "category": "Elevated Stress",
            "kind": "Grounded Comfort",
            "cover": "https://www.gutenberg.org/cache/epub/45/pg45.cover.medium.jpg",
            "description": "A comforting story of warmth, imagination, and reassurance that brings you back to a steady, normal baseline.",
            "text": "Mrs. Rachel Lynde lived just where the Avonlea main road dipped down into a little hollow, fringed with alders and ladies' eardrops and traversed by a brook that had its source away back in the woods of the old Cuthbert place. Anne sat by the window of Green Gables and looked out at the orchard in full bloom. 'Isn't it wonderful?' she breathed. 'To think that tomorrow is a new day with no mistakes in it yet!' Marilla looked up from her knitting with a mild smile. 'You're a strange child, Anne, but you certainly have a way of making the world seem bright.' The cool breeze blew through the lace curtains, carrying the scent of apple blossoms, and Anne felt the tension of her long journey melt away into the familiar safety of home."
        },
        {
            "id": "el_2",
            "title": "A Room with a View",
            "author": "E. M. Forster",
            "category": "Elevated Stress",
            "kind": "Light Drama & Perspective",
            "cover": "https://www.gutenberg.org/cache/epub/2641/pg2641.cover.medium.jpg",
            "description": "A gentle, perspective-shifting tale of sunny Italian vistas that helps center emotions when feeling wound up.",
            "text": "The Signora had no business to do it, she said; no business at all. They had been promised rooms with a view of the Arno, and here they were overlooking a dull courtyard. But when Lucy opened the wooden shutters of the dining room window the next morning, the golden morning light of Florence flooded the room. The river sparkled beneath the old bridges, and the distant hills were wrapped in a soft blue mist. Standing there, taking in the wide horizon, Lucy realized how small her temporary worries really were against the vast beauty of the world."
        },
        {
            "id": "el_3",
            "title": "The Little Prince",
            "author": "Antoine de Saint-Exupéry",
            "category": "Elevated Stress",
            "kind": "Grounded Wisdom",
            "cover": "https://www.gutenberg.org/cache/epub/25656/pg25656.cover.medium.jpg",
            "description": "Simple, profound warmth that reminds you of what truly matters, regulating emotional turbulence.",
            "text": "It is only with the heart that one can see rightly; what is essential is invisible to the eye. The little prince went back to look at the roses again. 'You're not at all like my rose,' he said. 'As yet you are nothing. No one has tamed you, and you have tamed no one.' And he returned to the fox. 'Goodbye,' he said. 'Goodbye,' said the fox. 'Here is my secret. It is very simple: It is only with the heart that one can see rightly. The time you have lost for your rose is what makes your rose so important.' The quiet rhythm of the desert night brought a gentle silence over the stars."
        }
    ],
    "normal": [
        {
            "id": "no_1",
            "title": "Alice's Adventures in Wonderland",
            "author": "Lewis Carroll",
            "category": "Normal",
            "kind": "Joyful Whimsy",
            "cover": "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
            "description": "Playful, imaginative magic that brings delight, smiles, and high-spirits during balanced moments.",
            "text": "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?' So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her. There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' But when the Rabbit actually TOOK A WATCH OUT OF ITS VEST-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it!"
        },
        {
            "id": "no_2",
            "title": "The Adventures of Sherlock Holmes",
            "author": "Arthur Conan Doyle",
            "category": "Normal",
            "kind": "Engaging Mystery",
            "cover": "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
            "description": "Crisp observation and lively intellectual spark to elevate a good mood into pure engagement.",
            "text": "To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory. Holmes sat by the fire in 221B Baker Street, smoking his pipe with a look of quiet satisfaction as he laid out the mysterious letter."
        },
        {
            "id": "no_3",
            "title": "Pride and Prejudice",
            "author": "Jane Austen",
            "category": "Normal",
            "kind": "Sparkling Joy",
            "cover": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
            "description": "Witty social observation and brilliant banter that keeps your spirit joyful and upbeat.",
            "text": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters. 'My dear Mr. Bennet,' said his lady to him one day, 'have you heard that Netherfield Park is let at last?' Mr. Bennet replied that he had not. 'But it is,' returned she; 'for Mrs. Long has just been here, and she told me all about it.' Mr. Bennet made no answer. 'Do you not want to know who has taken it?' cried his wife impatiently. 'YOU want to tell me, and I have no objection to hearing it.' This was invitation enough!"
        }
    ],
    "active": [
        {
            "id": "ac_1",
            "title": "Emma",
            "author": "Jane Austen",
            "category": "Physically Active",
            "kind": "Rom-Com / Romantic Comedy",
            "cover": "https://www.gutenberg.org/cache/epub/158/pg158.cover.medium.jpg",
            "description": "A delightful romantic comedy of matchmaking misadventures, high energy, and charming romantic spark during workouts.",
            "text": "Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence; and had lived nearly twenty-one years in the world with very little to distress or vex her. But her greatest passion was matchmaking! 'I lay it down as a general rule, Harriet,' said Emma briskly as they walked along the garden path, 'that if a woman doubts whether she ought to accept a man or not, she certainly ought to refuse him.' Mr. Knightley shook his head with a witty smile as he caught up with them. 'Emma, you are playing with fire again, but I must admit your energy is infectious!' The lively banter kept their steps light and fast along the sunny lane."
        },
        {
            "id": "ac_2",
            "title": "The Enchanted April",
            "author": "Elizabeth von Arnim",
            "category": "Physically Active",
            "kind": "Rom-Com / Uplifting Romance",
            "cover": "https://www.gutenberg.org/cache/epub/16389/pg16389.cover.medium.jpg",
            "description": "A breezy, sunny romantic comedy set in an Italian castle that fuels physical momentum with lighthearted love.",
            "text": "To those who appreciate wisteria and sunshine. Four women, entirely different in background, escape rain-soaked London to rent a small medieval Italian castle for April. What follows is a riot of blossoming flowers, unexpected romantic entanglements, and laugh-out-loud misunderstandings under the Mediterranean sun. Mrs. Wilkins looked out at the turquoise sea and laughed out loud—it was impossible not to feel buoyant and filled with sudden, joyful energy!"
        },
        {
            "id": "ac_3",
            "title": "Daddy-Long-Legs",
            "author": "Jean Webster",
            "category": "Physically Active",
            "kind": "Rom-Com / Epistolary Romance",
            "cover": "https://www.gutenberg.org/cache/epub/157/pg157.cover.medium.jpg",
            "description": "Witty, energetic, and charming romance letters that match an upbeat workout tempo.",
            "text": "Dear Daddy-Long-Legs, You should see me now! I am learning to play basketball, and I am the fastest runner on the freshman team! Today in college I met the most infuriating yet fascinating man, Mr. Jervis Pendleton. He pretends to be so stern, but every time I make a funny remark his eyes sparkle. I ran three miles around the track today just thinking of our banter!"
        }
    ],
    "recovery": [
        {
            "id": "rc_1",
            "title": "Three Men in a Boat",
            "author": "Jerome K. Jerome",
            "category": "Recovery",
            "kind": "Hilarious Comedy",
            "cover": "https://www.gutenberg.org/cache/epub/308/pg308.cover.medium.jpg",
            "description": "Side-splitting comic misadventures on the river guaranteed to make you laugh and boost physical recovery with joy.",
            "text": "There were four of us—George, and William Samuel Harris, and myself, and Montmorency, the dog. We were sitting in my room, smoking, and talking about how bad we were—bad from a medical point of view I mean, of course. We were all feeling seedy, and we were getting quite nervous about it. Harris said he felt such extraordinary fits of giddiness come over him at times, that he hardly knew what he was doing; and then George said that HE had fits of giddiness too, and hardly knew what HE was doing. With me, it was my liver that was out of order. I knew it was my liver that was out of order, because I had just been reading a patent liver-pill circular, in which were detailed the various symptoms by which a man could tell when his liver was out of order. I had them all! It was a most extraordinary thing, but I never read a patent medicine advertisement without being impelled to the conclusion that I am suffering from the particular disease therein treated in its most virulent form! We laughed so hard our ribs ached, and that laughter was the best medicine of all."
        },
        {
            "id": "rc_2",
            "title": "The Importance of Being Earnest",
            "author": "Oscar Wilde",
            "category": "Recovery",
            "kind": "Witty Comedy / Laugh Out Loud",
            "cover": "https://www.gutenberg.org/cache/epub/844/pg844.cover.medium.jpg",
            "description": "Sparkling comedic satire and hilarious double-lives that lift your mood during post-workout or rest periods.",
            "text": "Algernon: 'How are you, my dear Ernest? What brings you up to town?' Jack: 'Oh, pleasure, pleasure! What else should bring one anywhere? Eating cucumber sandwiches, Algernon?' Algernon: 'Why on earth do you say that? They are for Lady Bracknell!' Jack: 'Well, you have been eating them all the time!' Algernon: 'That is quite a different matter. She is my aunt.' The sheer absurdity of their argument made both of them burst into uncontrollable laughter, wiping away every trace of fatigue."
        },
        {
            "id": "rc_3",
            "title": "Cranford",
            "author": "Elizabeth Gaskell",
            "category": "Recovery",
            "kind": "Gentle Comedy & Warmth",
            "cover": "https://www.gutenberg.org/cache/epub/394/pg394.cover.medium.jpg",
            "description": "Warm, comical portraits of town eccentricities that bring smiles, laughter, and lighthearted relaxation.",
            "text": "In the first place, Cranford is in possession of the Amazons; all the holders of houses above a certain rent are women. If a married couple come to settle in the town, somehow the gentleman disappears; he is either killed or sent to India. The funniest incident occurred when Miss Pole tried to fit her cow with a flannel suit after a minor accident! Seeing the cow trotting around the village in crimson flannel pajamas brought the entire town into tears of laughter."
        }
    ]
}


def get_all_categories() -> dict:
    return CATALOG


def get_stories_for_mode(mode: str) -> list[dict]:
    # Mode mapping to catalog keys
    mode_map = {
        "high_stress": "high_stress",
        "restore": "high_stress",
        "elevated": "elevated",
        "settle": "elevated",
        "normal": "normal",
        "everyday": "normal",
        "focus": "normal",
        "active": "active",
        "workout": "active",
        "recovery": "recovery",
        "calm": "recovery",
    }
    key = mode_map.get(mode, "normal")
    return CATALOG.get(key, CATALOG["normal"])


def knowledge_graph(mode: str, assessment: dict) -> dict:
    profile = recommend(assessment["state"], mode)["profile"]
    return {
        "nodes": [
            {"id": "signals", "label": "Biometric signals", "group": "signal"},
            {"id": "state", "label": assessment["state_label"], "group": "state"},
            {"id": "voice", "label": assessment["voice_profile"]["label"], "group": "voice"},
            {"id": "content", "label": ", ".join(profile["genres"]), "group": "content"},
            {"id": "goal", "label": "Listening goal: " + profile["label"], "group": "goal"},
        ],
        "links": [
            {"from": "signals", "to": "state", "label": "; ".join(assessment["reasons"])},
            {"from": "state", "to": "voice", "label": assessment["voice_profile"]["processing"]},
            {"from": "state", "to": "content", "label": "matches the selected emotion folder"},
            {"from": "voice", "to": "goal", "label": "supports targeted behavior change"},
            {"from": "content", "to": "goal", "label": "narrative pacing helps adjust emotional state"},
        ],
    }
