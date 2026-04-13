"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # guestbook_entries
    op.create_table(
        "guestbook_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column("name", sa.String(80), nullable=True),
        sa.Column("message", sa.String(300), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_guestbook_created", "guestbook_entries", ["created_at"], postgresql_ops={"created_at": "DESC"})

    # leaderboard_entries
    op.create_table(
        "leaderboard_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column("name", sa.String(80), nullable=True),
        sa.Column("messages_needed", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=False),
        sa.Column("image_prompt", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_leaderboard_messages", "leaderboard_entries", ["messages_needed"])
    op.create_index("idx_leaderboard_created", "leaderboard_entries", ["created_at"], postgresql_ops={"created_at": "DESC"})

    # challenge_sessions
    op.create_table(
        "challenge_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column(
            "leaderboard_id",
            sa.Integer(),
            sa.ForeignKey("leaderboard_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("history", sa.JSON(), nullable=False),
        sa.Column("messages_count", sa.Integer(), nullable=False),
        sa.Column(
            "solved_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("idx_challenge_lb", "challenge_sessions", ["leaderboard_id"])

    # generated_images
    op.create_table(
        "generated_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column("filename", sa.String(200), nullable=False, unique=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column(
            "leaderboard_id",
            sa.Integer(),
            sa.ForeignKey("leaderboard_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # cat_state_log
    op.create_table(
        "cat_state_log",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("hunger", sa.SmallInteger(), nullable=False),
        sa.Column("happy", sa.SmallInteger(), nullable=False),
        sa.Column("trigger", sa.String(20), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        sa.Column(
            "logged_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("cat_state_log")
    op.drop_table("generated_images")
    op.drop_index("idx_challenge_lb", "challenge_sessions")
    op.drop_table("challenge_sessions")
    op.drop_index("idx_leaderboard_created", "leaderboard_entries")
    op.drop_index("idx_leaderboard_messages", "leaderboard_entries")
    op.drop_table("leaderboard_entries")
    op.drop_index("idx_guestbook_created", "guestbook_entries")
    op.drop_table("guestbook_entries")
