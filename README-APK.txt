# VITROCASH — base propre pour APK

Cette archive repart du projet VITROCASH original. Elle ajoute uniquement la configuration Capacitor Android et le workflow GitHub Actions de génération APK.

- Configuration Capacitor en JSON (pas de fichier TypeScript).
- Capacitor 7.4.3 fixé explicitement.
- TypeScript 5.9.3 fixé pour éviter le chargeur TS 7 rencontré précédemment.
- Workflow Android séparé ; le workflow GitHub Pages existant n'est pas inclus.

Le fichier APK est produit par GitHub Actions après import dans un dépôt GitHub et se récupère dans les artefacts de l'exécution réussie.
