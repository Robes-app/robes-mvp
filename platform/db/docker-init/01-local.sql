-- Local only: the app login role and a separate database for automated tests.
create role robes_app login password 'robes_app_local' noinherit;
create database robes_test;
