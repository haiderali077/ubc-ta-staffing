Write-Host "=== Checking for tacoord@ubc.ca user ==="
docker exec allocaid-db psql -U allocaid_user -d allocaid_db -c "SELECT user_id, name, email, role FROM users WHERE email = 'tacoord@ubc.ca';"

Write-Host "`n=== All users in database ==="
docker exec allocaid-db psql -U allocaid_user -d allocaid_db -c "SELECT user_id, name, email, role FROM users ORDER BY user_id;" 