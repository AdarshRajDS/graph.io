"""Phase 1 placeholder. Render job tables are added in Phase 4."""

from collections.abc import Sequence

revision: str = "0001_phase1_placeholder"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
