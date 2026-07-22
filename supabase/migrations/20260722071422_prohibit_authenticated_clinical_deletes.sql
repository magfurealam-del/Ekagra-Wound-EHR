-- Confirmed clinical history is amended or offboarded, never deleted by a client.
revoke delete on all tables in schema identity from authenticated;
revoke delete on all tables in schema patients from authenticated;
revoke delete on all tables in schema clinical from authenticated;
revoke delete on all tables in schema treatment from authenticated;
revoke delete on all tables in schema investigations from authenticated;
revoke delete on all tables in schema referrals from authenticated;
revoke delete on all tables in schema operations from authenticated;
