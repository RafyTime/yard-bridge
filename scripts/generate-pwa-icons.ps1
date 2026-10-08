# Temporary icons, using the same geometry as static/icons/icon.svg.
Add-Type -AssemblyName System.Drawing
$taskIconDirectory = Join-Path $PSScriptRoot '../static/icons'
[System.IO.Directory]::CreateDirectory($taskIconDirectory) | Out-Null

foreach ($taskIcon in @(
    @{ Name = 'icon-192.png'; Size = 192 },
    @{ Name = 'icon-512.png'; Size = 512 },
    @{ Name = 'icon-maskable-512.png'; Size = 512 },
    @{ Name = 'apple-touch-icon.png'; Size = 180 }
)) {
    $taskBitmap = [System.Drawing.Bitmap]::new($taskIcon.Size, $taskIcon.Size)
    $taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
    $taskGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#292524'))
    $taskGraphics.ScaleTransform($taskIcon.Size / 512.0, $taskIcon.Size / 512.0)
    $taskBackBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#a8a29e'))
    $taskFrontBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fafaf9'))
    $taskSuitBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#292524'))
    try {
        foreach ($taskCard in @(
            @{ X = 142; Y = 128; Brush = $taskBackBrush },
            @{ X = 166; Y = 112; Brush = $taskFrontBrush }
        )) {
            $taskPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
            try {
                $taskPath.AddArc($taskCard.X, $taskCard.Y, 40, 40, 180, 90)
                $taskPath.AddArc($taskCard.X + 164, $taskCard.Y, 40, 40, 270, 90)
                $taskPath.AddArc($taskCard.X + 164, $taskCard.Y + 232, 40, 40, 0, 90)
                $taskPath.AddArc($taskCard.X, $taskCard.Y + 232, 40, 40, 90, 90)
                $taskPath.CloseFigure()
                $taskGraphics.FillPath($taskCard.Brush, $taskPath)
            } finally { $taskPath.Dispose() }
        }
        $taskSuit = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try {
            $taskSuit.AddLine(268, 180, 224, 226)
            $taskSuit.AddBezier(224, 226, 196, 256, 218, 286, 246, 274)
            $taskSuit.AddLine(246, 274, 240, 306)
            $taskSuit.AddLine(240, 306, 296, 306)
            $taskSuit.AddLine(296, 306, 290, 274)
            $taskSuit.AddBezier(290, 274, 318, 286, 340, 256, 312, 226)
            $taskSuit.CloseFigure()
            $taskGraphics.FillPath($taskSuitBrush, $taskSuit)
        } finally { $taskSuit.Dispose() }
        $taskBitmap.Save((Join-Path $taskIconDirectory $taskIcon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $taskSuitBrush.Dispose()
        $taskFrontBrush.Dispose()
        $taskBackBrush.Dispose()
        $taskGraphics.Dispose()
        $taskBitmap.Dispose()
    }
}
