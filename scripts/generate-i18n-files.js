const fs = require('fs');
const path = require('path');

// Language mappings with basic translations
const languages = {
  es: {
    name: 'Spanish',
    translations: {
      // Basic translations for Spanish - these can be expanded later
      'Sign In': 'Iniciar Sesión',
      'Sign Up': 'Registrarse',
      'Sign Out': 'Cerrar Sesión',
      'Home': 'Inicio',
      'Library': 'Biblioteca',
      'Profile': 'Perfil',
      'Settings': 'Configuración',
      'About': 'Acerca de',
      'Help': 'Ayuda',
      'Loading...': 'Cargando...',
      'Save': 'Guardar',
      'Cancel': 'Cancelar',
      'Delete': 'Eliminar',
      'Edit': 'Editar',
      'Close': 'Cerrar',
      'Error': 'Error',
      'Success': 'Éxito',
      'Warning': 'Advertencia',
      'Info': 'Información',
    }
  },
  fr: {
    name: 'French',
    translations: {
      'Sign In': 'Se connecter',
      'Sign Up': 'S\'inscrire',
      'Sign Out': 'Se déconnecter',
      'Home': 'Accueil',
      'Library': 'Bibliothèque',
      'Profile': 'Profil',
      'Settings': 'Paramètres',
      'About': 'À propos',
      'Help': 'Aide',
      'Loading...': 'Chargement...',
      'Save': 'Enregistrer',
      'Cancel': 'Annuler',
      'Delete': 'Supprimer',
      'Edit': 'Modifier',
      'Close': 'Fermer',
      'Error': 'Erreur',
      'Success': 'Succès',
      'Warning': 'Avertissement',
      'Info': 'Information',
    }
  },
  de: {
    name: 'German',
    translations: {
      'Sign In': 'Anmelden',
      'Sign Up': 'Registrieren',
      'Sign Out': 'Abmelden',
      'Home': 'Startseite',
      'Library': 'Bibliothek',
      'Profile': 'Profil',
      'Settings': 'Einstellungen',
      'About': 'Über',
      'Help': 'Hilfe',
      'Loading...': 'Laden...',
      'Save': 'Speichern',
      'Cancel': 'Abbrechen',
      'Delete': 'Löschen',
      'Edit': 'Bearbeiten',
      'Close': 'Schließen',
      'Error': 'Fehler',
      'Success': 'Erfolg',
      'Warning': 'Warnung',
      'Info': 'Information',
    }
  },
  it: {
    name: 'Italian',
    translations: {
      'Sign In': 'Accedi',
      'Sign Up': 'Registrati',
      'Sign Out': 'Esci',
      'Home': 'Home',
      'Library': 'Biblioteca',
      'Profile': 'Profilo',
      'Settings': 'Impostazioni',
      'About': 'Informazioni',
      'Help': 'Aiuto',
      'Loading...': 'Caricamento...',
      'Save': 'Salva',
      'Cancel': 'Annulla',
      'Delete': 'Elimina',
      'Edit': 'Modifica',
      'Close': 'Chiudi',
      'Error': 'Errore',
      'Success': 'Successo',
      'Warning': 'Avviso',
      'Info': 'Informazioni',
    }
  },
  pt: {
    name: 'Portuguese',
    translations: {
      'Sign In': 'Entrar',
      'Sign Up': 'Cadastrar',
      'Sign Out': 'Sair',
      'Home': 'Início',
      'Library': 'Biblioteca',
      'Profile': 'Perfil',
      'Settings': 'Configurações',
      'About': 'Sobre',
      'Help': 'Ajuda',
      'Loading...': 'Carregando...',
      'Save': 'Salvar',
      'Cancel': 'Cancelar',
      'Delete': 'Excluir',
      'Edit': 'Editar',
      'Close': 'Fechar',
      'Error': 'Erro',
      'Success': 'Sucesso',
      'Warning': 'Aviso',
      'Info': 'Informação',
    }
  }
};

const translationFiles = [
  'common.json',
  'navigation.json',
  'auth.json',
  'profile.json',
  'reader.json',
  'errors.json'
];

function translateValue(value, translations) {
  if (typeof value === 'string') {
    return translations[value] || value;
  }
  return value;
}

function translateObject(obj, translations) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = translateObject(value, translations);
    } else {
      result[key] = translateValue(value, translations);
    }
  }
  return result;
}

function generateLanguageFiles() {
  const baseDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
  const enDir = path.join(baseDir, 'en');
  
  for (const [langCode, langData] of Object.entries(languages)) {
    const langDir = path.join(baseDir, langCode);
    
    // Create language directory if it doesn't exist
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }
    
    // Copy and translate files
    for (const fileName of translationFiles) {
      const enFilePath = path.join(enDir, fileName);
      const langFilePath = path.join(langDir, fileName);
      
      // Skip if file already exists (don't overwrite existing translations)
      if (fs.existsSync(langFilePath)) {
        console.log(`Skipping ${langCode}/${fileName} - file already exists`);
        continue;
      }
      
      if (fs.existsSync(enFilePath)) {
        try {
          const enContent = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
          const translatedContent = translateObject(enContent, langData.translations);
          
          fs.writeFileSync(langFilePath, JSON.stringify(translatedContent, null, 2), 'utf8');
          console.log(`Generated ${langCode}/${fileName}`);
        } catch (error) {
          console.error(`Error generating ${langCode}/${fileName}:`, error);
        }
      } else {
        console.warn(`Source file ${enFilePath} not found`);
      }
    }
  }
}

console.log('Generating i18n files...');
generateLanguageFiles();
console.log('Done!');