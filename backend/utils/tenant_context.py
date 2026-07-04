import threading
from django.db import connection

_thread_locals = threading.local()

def set_db_tenant_context(tenant_id):
    """
    Sets the tenant ID in the active PostgreSQL database connection session.
    This enables Postgres Row-Level Security (RLS) policies to isolate data.
    """
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            if tenant_id:
                # PostgreSQL session setting
                cursor.execute(f"SET app.current_tenant_id = '{tenant_id}';")
            else:
                cursor.execute("RESET app.current_tenant_id;")

def set_current_tenant(tenant):
    setattr(_thread_locals, 'tenant', tenant)
    # Set DB connection-level RLS context
    set_db_tenant_context(tenant.id if tenant else None)

def get_current_tenant():
    return getattr(_thread_locals, 'tenant', None)

def clear_current_tenant():
    if hasattr(_thread_locals, 'tenant'):
        delattr(_thread_locals, 'tenant')
    # Reset DB connection-level RLS context
    set_db_tenant_context(None)

def enable_rls_for_table(table_name):
    """
    Returns a migrations.RunPython operation that enables Row-Level Security
    and creates the tenant isolation policy on the specified table in PostgreSQL.
    """
    from django.db import migrations

    def forwards(apps, schema_editor):
        if schema_editor.connection.vendor == 'postgresql':
            with schema_editor.connection.cursor() as cursor:
                # Enable RLS and force it even for the table owner/superuser in standard sessions
                cursor.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
                cursor.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;")
                # Drop existing policy if it exists to avoid errors on reapplying
                cursor.execute(f"DROP POLICY IF EXISTS {table_name}_tenant_isolation ON {table_name};")
                # Create the policy: bypass if app.current_tenant_id is not set (e.g. migrations/admin),
                # otherwise restrict query results to the current tenant.
                cursor.execute(f"""
                    CREATE POLICY {table_name}_tenant_isolation ON {table_name}
                    USING (
                        current_setting('app.current_tenant_id', true) IS NULL
                        OR current_setting('app.current_tenant_id', true) = ''
                        OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
                    );
                """)

    def backwards(apps, schema_editor):
        if schema_editor.connection.vendor == 'postgresql':
            with schema_editor.connection.cursor() as cursor:
                cursor.execute(f"DROP POLICY IF EXISTS {table_name}_tenant_isolation ON {table_name};")
                cursor.execute(f"ALTER TABLE {table_name} NO FORCE ROW LEVEL SECURITY;")
                cursor.execute(f"ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;")

    return migrations.RunPython(forwards, backwards)

