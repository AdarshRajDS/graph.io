"""Create renders table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_renders"
down_revision: str | Sequence[str] | None = "0001_phase1_placeholder"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "renders",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("spec", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("video_mp4_key", sa.String(length=512), nullable=True),
        sa.Column("video_webm_key", sa.String(length=512), nullable=True),
        sa.Column("thumbnail_key", sa.String(length=512), nullable=True),
        sa.Column("celery_task_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_renders_content_hash", "renders", ["content_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_renders_content_hash", table_name="renders")
    op.drop_table("renders")
