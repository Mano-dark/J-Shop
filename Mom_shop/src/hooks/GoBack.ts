import { useEffect } from 'react';

export const usePreventBackNavigation = () => {
    useEffect(() => {
        // On ajoute une entrée "fantôme" pour pouvoir détecter le retour
        window.history.pushState(null, '', window.location.href);
      
        const handlePopState = (event: PopStateEvent) => {
          // event est maintenant utilisé (même si ici on s'en sert peu,
          // c'est une bonne pratique de le typer et de le garder)
          console.log('Retour arrière détecté', event.state); // ← exemple d'utilisation
      
          const reallyWantToLeave = window.confirm(
            "Voulez-vous vraiment revenir en arrière ? Vous perdrez vos modifications."
          );
      
          if (reallyWantToLeave) {
            // On laisse faire le retour naturel
            window.history.back();
          } else {
            // On bloque en repoussant une nouvelle entrée dans l'historique
            window.history.pushState(null, '', window.location.href);
          }
        };
      
        window.addEventListener('popstate', handlePopState);
      
        return () => {
          window.removeEventListener('popstate', handlePopState);
        };
      }, []);
};