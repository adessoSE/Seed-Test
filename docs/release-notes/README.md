# Release notes

Cut a release:

1. Publish a GitHub release named `Seed-Test_vX.Y.Z`. Publishing it builds and pushes the Docker images.
2. Click "Generate release notes". PR labels sort entries into categories (see `.github/release.yml`).
3. Paste the "Breaking Changes" section of `docs/release-notes/X.Y.Z.md` at the top, and attach `docker-compose.yml` and `.env.example` as assets.
