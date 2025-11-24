Feature: Register
  As a new user
  I want to create an account
  So that I can access the application

  Scenario: Successful registration
    Given I am on the login page
    When I click on the register link
    Then I should see the register page
    When I fill the register form with username "test4", email "test4@gmail.com" and password "password123" and whatsapp number "+251912345678"
    And I click on the register button
    Then I should see the dashboard
    Then I should see a message "Registration successful! Please check your email to verify your account."
