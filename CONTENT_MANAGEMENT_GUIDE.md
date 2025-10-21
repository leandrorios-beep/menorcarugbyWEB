# Menorca Rugby Club - Content Management System

## Overview
The website now features a comprehensive content management system that allows you to edit all text content across all 6 supported languages (Spanish, English, Catalan, French, Italian, Portuguese) by simply editing external text files without touching any code.

## How It Works

### System Components
1. **Content Loader** (`js/content-loader.js`) - Handles loading and caching content from text files
2. **Main Integration** (`js/main.js`) - Manages content loading and language switching
3. **Content Files** (`content/` directory) - External text files for all content
4. **HTML Integration** - Updated HTML with IDs for dynamic content loading

### Language Support
The system supports 6 languages with automatic fallback to Spanish:
- **es** (Spanish) - Default language
- **en** (English)
- **ca** (Catalan)
- **fr** (French)
- **it** (Italian)
- **pt** (Portuguese)

### Content File Structure
Content files are located in the `/content/` directory with the naming convention:
```
[content-key]-[language].txt
```

For example:
- `about-historia-es.txt` (Spanish)
- `about-historia-en.txt` (English)
- `about-historia-ca.txt` (Catalan)
- etc.

## Available Content Sections

### About Section
- **about-historia** - Club history text
- **about-filosofia** - Club philosophy text

### Team Descriptions
- **equipo-senior** - Senior team description
- **equipo-juvenil** - Youth team description
- **equipo-escuela** - School team description

### Join Us Section
- **unete-titulo** - "Join Us" section title
- **unete-descripcion** - "Join Us" section description

## How to Edit Content

### Step 1: Locate the Content File
Find the appropriate content file in the `/content/` directory based on:
1. The content you want to change
2. The language you want to edit

### Step 2: Edit the Text
1. Open the `.txt` file in any text editor
2. Edit the content (plain text only)
3. Save the file

### Step 3: View Changes
1. Refresh the website
2. Changes will appear immediately
3. If editing a non-Spanish language, use the language switcher to view the changes

## Example Usage

### To change the senior team description in English:
1. Open `content/equipo-senior-en.txt`
2. Edit the text: "Our first team competes in the regional league..."
3. Save the file
4. Refresh the website and switch to English to see changes

### To add new content section:
1. Create content files for all 6 languages following the naming convention
2. Add the content mapping in `js/main.js` in the `contentMap` object
3. Add the corresponding HTML element with the appropriate ID

## Content Files Reference

### Complete List of Available Content Files (42 total):
```
about-filosofia-ca.txt    about-filosofia-en.txt    about-filosofia-es.txt
about-filosofia-fr.txt    about-filosofia-it.txt    about-filosofia-pt.txt
about-historia-ca.txt     about-historia-en.txt     about-historia-es.txt
about-historia-fr.txt     about-historia-it.txt     about-historia-pt.txt
equipo-escuela-ca.txt     equipo-escuela-en.txt     equipo-escuela-es.txt
equipo-escuela-fr.txt     equipo-escuela-it.txt     equipo-escuela-pt.txt
equipo-juvenil-ca.txt     equipo-juvenil-en.txt     equipo-juvenil-es.txt
equipo-juvenil-fr.txt     equipo-juvenil-it.txt     equipo-juvenil-pt.txt
equipo-senior-ca.txt      equipo-senior-en.txt      equipo-senior-es.txt
equipo-senior-fr.txt      equipo-senior-it.txt      equipo-senior-pt.txt
unete-descripcion-ca.txt  unete-descripcion-en.txt  unete-descripcion-es.txt
unete-descripcion-fr.txt  unete-descripcion-it.txt  unete-descripcion-pt.txt
unete-titulo-ca.txt       unete-titulo-en.txt       unete-titulo-es.txt
unete-titulo-fr.txt       unete-titulo-it.txt       unete-titulo-pt.txt
```

## Technical Details

### System Features
- **Automatic Caching** - Content is cached for performance
- **Language Fallback** - If a language file is missing, Spanish is used as fallback
- **Dynamic Loading** - Content loads automatically when language changes
- **Error Handling** - Graceful handling of missing files
- **No Code Required** - Edit content without touching HTML/JS/CSS

### Integration Points
The content management system integrates with:
1. **i18n System** - Listens for language change events
2. **HTML Elements** - Updates elements with specific IDs
3. **Content Loader** - Manages file loading and caching

## Maintenance

### Adding New Content
1. Create content files for all 6 languages
2. Add mapping in `js/main.js` contentMap
3. Add HTML element with corresponding ID

### Backup
Always backup the `/content/` directory before making bulk changes.

### Language Consistency
Ensure all 6 language files exist for each content key to maintain consistency across languages.

---

## Quick Start Guide

1. **Edit existing content**: Find the `.txt` file in `/content/` and edit it
2. **Save the file**: Use any text editor
3. **View changes**: Refresh the website
4. **Switch languages**: Use the language switcher to see changes in other languages

The system is designed to be user-friendly and requires no technical knowledge to manage content across all languages.