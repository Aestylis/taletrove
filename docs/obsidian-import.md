# Importing from Obsidian into TaleTrove

TaleTrove can read an Obsidian vault and convert your notes into Encyclopedia entries — People, Locations, Items, and Organizations. It reads the content of your notes, not your folder names, so it works regardless of how you organized your vault.

---

## Quick Start

1. Open TaleTrove and go to the **Project Hub** (the home screen).
2. Under **Open World**, click **From Obsidian**.
3. When the system folder picker appears, select the root folder of your Obsidian vault — the one that contains the `.obsidian` folder.
4. TaleTrove scans your notes and shows a preview: how many will become People, Locations, Items, or Organizations, and how many it wasn't sure about.
5. Choose whether to tag everything with `obsidian-import` and which Encyclopedia folder to put them in.
6. Click **Import**. When it finishes, download the log — it tells you exactly what was classified as what and why.

---

## What Gets Imported

| Your note contains… | Becomes… |
|---|---|
| `alignment`, `class`, D&D stats (`str`, `dex`, etc.), `born`, `age` | **Person / Character** |
| Tags like `npc`, `deity`, `creature`, `villain`, `king` | **Person / Character** |
| Headings like *Abilities*, *Actions*, *Biography*, *Hit Points* | **Person / Character** |
| `population`, `climate`, `terrain`, `government` | **Location** |
| Tags like `city`, `dungeon`, `temple`, `region`, `landmark` | **Location** |
| Headings like *Population*, *Economy*, *Founding History* | **Location** |
| `rarity`, `value`, `attunement`, `damage`, `cost` | **Item / Thing** |
| Tags like `artifact`, `weapon`, `flora`, `ingredient`, `vehicle` | **Item / Thing** |
| Headings like *Effects*, *Crafting*, *Alchemical Properties* | **Item / Thing** |
| `members`, `leader`, `headquarters`, `ranks`, `ideology` | **Organization** |
| Tags like `faction`, `guild`, `cult`, `order`, `alliance` | **Organization** |

A note can fire signals from multiple categories — TaleTrove picks the one with the highest score. The confidence threshold is intentionally low: it's better to import something with the wrong type (easy to fix) than to silently discard it.

---

## What Gets Skipped

Notes that look like GM/DM operational tools are skipped automatically and listed in the import log. The skip signal is content-based — headings like these trigger it:

- *Session Notes* / *Session Log*
- *Encounter Table* / *Random Encounter*
- *House Rules* / *DM Notes* / *GM Notes*
- *Combat Tracker* / *Loot Table*
- *Audio Playlist* / *Battle Map*
- *Adventure Outline* / *Adventure Hooks*

If a note was skipped and you think it shouldn't have been, open it in Obsidian, add a `type:` field to the frontmatter (see below), and re-import.

---

## How to Get the Best Results

### Use a `type:` field in frontmatter

This is the strongest signal and overrides everything else. Add it to any note:

```yaml
---
type: Character
---
```

Valid values: `Character`, `Location`, `Item`, `Organization` (case-insensitive; common aliases like `person`, `npc`, `city`, `artifact`, `faction` also work).

### Use frontmatter tags

Tags are the second-strongest signal. If your vault uses them consistently, most notes will classify correctly without any extra work:

```yaml
---
tags: [NPC, Fighter, Mordalla]
---
```

Tag keywords that help classification:

- **People:** `npc`, `character`, `pc`, `villain`, `deity`, `creature`, `noble`, `merchant`, `cleric`, `wizard`, `fighter`, `rogue`, `ranger`, `paladin`, `monk`, `druid`, `sorcerer`, `warlock`, `bard`
- **Locations:** `city`, `town`, `village`, `dungeon`, `temple`, `castle`, `region`, `forest`, `island`, `landmark`, `ruins`, `tavern`, `port`
- **Items:** `item`, `artifact`, `weapon`, `armor`, `potion`, `magic`, `plant`, `flora`, `mineral`, `ingredient`, `vehicle`
- **Organizations:** `faction`, `guild`, `clan`, `cult`, `order`, `society`, `brotherhood`, `council`, `military`

### Use structured section headings

Notes with clear H2/H3 headings like **Abilities**, **Backstory**, **Population**, or **Properties** classify very reliably even without any frontmatter.

### Keep D&D stat blocks in frontmatter

If you use properties like `alignment`, `class`, `str`, `dex`, `con`, `int`, `wis`, `cha`, `hp`, or `cr`, TaleTrove treats them as strong person signals. A note with six stat keys in its frontmatter will classify as a Character with high confidence.

---

## How Images Work

TaleTrove looks for a resources folder inside your vault — it checks for folders named `_resources`, `attachments`, `assets`, `files`, or `media` at the root and one level deep.

Images are imported in two ways:

- **`![[filename.png]]`** — Obsidian's native embed syntax is detected and the image is imported as a block.
- **`<img src=".../_resources/filename.jpg">`** — HTML image tags with resource paths are also detected.

The **first image** found in each note becomes the entry's hero image (shown at the top of the inspector). Additional images become Image blocks in the content.

Images that can't be found in the resources folder are listed in the import log under *Image Errors*.

---

## How Wiki-Links Work

`[[Note Name]]` links are **preserved exactly as written** and will be live, navigable wiki-links inside TaleTrove — as long as the target note was also imported. TaleTrove resolves wiki-links by name at display time, so they never go stale after a rename.

`[[Note Name|Display Text]]` (Obsidian alias syntax) is converted to `[[Note Name]]`. The alias is lost because TaleTrove's wiki-link syntax doesn't support display text overrides — but the link still works.

Links pointing to notes that weren't imported (skipped files, external references, session notes, etc.) are flagged as broken in the import log. They still appear in the text — TaleTrove just renders them with a muted "not found" style until you either import the target or remove the link.

---

## After Import: Reviewing Unclassified Entries

Unclassified entries are notes TaleTrove couldn't confidently categorize. They are still imported — nothing is discarded — and tagged with both `obsidian-import` and `unclassified`.

To find and fix them:

1. In the Encyclopedia panel, filter by the tag `unclassified`.
2. Open each entry and check the content. The type field in the inspector (top of the Properties panel) is a free-text dropdown — change it to the correct value.
3. Remove the `unclassified` tag when you're done.

To prevent future unclassified entries, add a `type:` field to those notes in Obsidian before re-importing.

---

## The Import Log

After every import, you can download a plain-text log. It records:

```
IMPORTED (213)
  ✓ Abbess G'Vera       → Character   [fm.alignment, fm.class, fm.born]
  ✓ Mordalla            → Location    [tag:city, heading:population]
  ✓ Black Briar         → Item        [fm.rarity, fm.value, tag:flora]

UNCLASSIFIED (12) — review manually
  ? The Calendar of Exilus  → Item  (no confident signals)
  ? Knaves & Nightshade     → Item  (no confident signals)

SKIPPED (30)
  ✗ Session Notes/Arrival at Mordalla
    Detected as GM/DM tool content (session notes, encounter tables, etc.)

BROKEN WIKI-LINKS
  Abbess G'Vera: [[Mistmoor Abbey]], [[Velkor's Faithful]]

IMAGE ERRORS
  Alken Bhestam: Alkenai_Bhestam.png — Not found in resources folder
```

The signal list next to each imported entry shows exactly what evidence fired. If a note classified wrong, those signals tell you why.

---

## FAQ

**Can I import the same vault twice?**
Yes, but you'll get duplicate entries. Use the `obsidian-import` tag to identify and clean up a previous import before running again.

**My notes have no frontmatter — will they import?**
Yes. Content headings alone are enough to classify most notes. The importer never requires frontmatter.

**Can I import just part of a vault?**
Currently the importer reads the entire vault. To import a subset, duplicate your vault folder, remove the notes you don't want, and import the copy.

**My resources folder has a different name.**
The importer checks for `_resources`, `attachments`, `assets`, `files`, and `media`. If your folder has a different name, rename it to one of these before importing, or manually re-assign hero images after import.

**Obsidian callouts (`> [!note]`, `> [!warning]`) — do they render?**
Yes. TaleTrove natively renders Obsidian callout syntax, so `> [!infobox]` and similar blocks will display styled in the inspector without any conversion.

**What about Dataview queries, canvas files, or plugin-specific syntax?**
These aren't converted — Dataview blocks and other plugin-specific markup will appear as raw text or be ignored. Only standard markdown, frontmatter YAML, `[[wiki-links]]`, and `![[image]]` embeds are processed.
