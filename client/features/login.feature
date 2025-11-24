Feature: Login
  Background:
    Given a verified user exists with email "test@example.com" and password "password"

  Scenario: Successful login
    Given I am on the login page
    When I login with email "test@example.com" and password "password"
    Then I should see the dashboard
