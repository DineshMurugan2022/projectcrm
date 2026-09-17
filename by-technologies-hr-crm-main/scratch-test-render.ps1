Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap('public\visiting-card-blank.png')
# Create 2048x1024 high res bitmap
$highRes = New-Object System.Drawing.Bitmap(2048, 1024)
$g = [System.Drawing.Graphics]::FromImage($highRes)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Draw base
$g.DrawImage($bmp, 0, 0, 2048, 1024)

# 1. Name
$fontName = New-Object System.Drawing.Font("Arial", 46, [System.Drawing.FontStyle]::Bold)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString("Imran", $fontName, $brushWhite, 424, 180)

# 2. Designation
$fontDes = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
$brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x1A, 0x25, 0x18))
$g.DrawString("Business Development Manager", $fontDes, $brushDark, 424, 260)

# 3. Phone
$fontContact = New-Object System.Drawing.Font("Arial", 26, [System.Drawing.FontStyle]::Bold)
$g.DrawString("+91 7824878137", $fontContact, $brushWhite, 226, 510)

# 4. Email
$fontEmail = New-Object System.Drawing.Font("Arial", 23, [System.Drawing.FontStyle]::Bold)
$g.DrawString("info@bnytechnologies.com", $fontEmail, $brushWhite, 226, 650)

# 5. Website
$g.DrawString("www.bnytechnologies.com", $fontEmail, $brushWhite, 226, 790)

# 6. Address
$fontAddr = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
$g.DrawString("No.624, Khivraj Building, 3rdFloor,", $fontAddr, $brushWhite, 226, 905)
$g.DrawString("Anna Salai, Chennai - 600006.", $fontAddr, $brushWhite, 226, 950)

$g.Dispose()
$highRes.Save('public\test-rendered-card.png', [System.Drawing.Imaging.ImageFormat]::Png)
$highRes.Dispose()
$bmp.Dispose()
Write-Host "Generated public\test-rendered-card.png"
