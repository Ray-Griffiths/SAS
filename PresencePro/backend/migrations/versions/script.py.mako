mako
<%
# Standard Alembic header
from alembic import op
import sqlalchemy as sa
%>
<%!
${imports if imports is not None else ''}
%>

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}

def upgrade():
    <%
    ${upgrades if upgrades is not None else "pass"}
    %>

def downgrade():
    <%
    ${downgrades if downgrades is not None else "pass"}
    %>
