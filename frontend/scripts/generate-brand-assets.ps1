# Reproduce launcher assets from the existing BrandMark bag/Z geometry.
Add-Type -AssemblyName System.Drawing
$assetDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets'))
function Write-BrandAsset([string]$Name, [bool]$Background, [int]$Size = 1024) {
    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform(($Size / 1024.0), ($Size / 1024.0))
    $graphics.Clear([System.Drawing.Color]::Transparent)
    if ($Background) { $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#25334E')) }
    # Keep the full mark inside the adaptive icon central safe zone.
    $graphics.TranslateTransform(256, 256)
    $graphics.ScaleTransform(16, 16)
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 1.7
    $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddLines([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(7,10), [System.Drawing.PointF]::new(25,10), [System.Drawing.PointF]::new(27,28), [System.Drawing.PointF]::new(5,28), [System.Drawing.PointF]::new(7,10)))
    $path.StartFigure()
    $path.AddLine(12,10,12,7)
    $path.AddBezier(12,7,12,1.67,20,1.67,20,7)
    $path.AddLine(20,7,20,10)
    $path.StartFigure()
    $path.AddLines([System.Drawing.PointF[]]@([System.Drawing.PointF]::new(12,15), [System.Drawing.PointF]::new(21,15), [System.Drawing.PointF]::new(12,23), [System.Drawing.PointF]::new(21,23)))
    $graphics.DrawPath($pen, $path)
    $bitmap.Save((Join-Path $assetDir $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $path.Dispose(); $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
Write-BrandAsset 'icon.png' $true
Write-BrandAsset 'android-icon-foreground.png' $false
Write-BrandAsset 'android-icon-monochrome.png' $false
Write-BrandAsset 'splash-icon.png' $false
Write-BrandAsset 'favicon.png' $true 64
