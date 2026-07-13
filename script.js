"use strict";

/*************************************************/
/* SECTION 1 - VERSION AND CANVAS                */
/*************************************************/

const VERSION = "0.0.2";

const Canvas = document.getElementById("GameCanvas");
const Ctx = Canvas.getContext("2d");

Ctx.imageSmoothingEnabled = false;


/*************************************************/
/* SECTION 2 - MAP DATA                          */
/*************************************************/

let MapData = null;

let TrackLayer = null;
let TrainLayer = null;

let LoadedTilesets = [];


/*************************************************/
/* SECTION 3 - TRAIN                             */
/*************************************************/

let Train =
{
    PixelX : 0,
    PixelY : 0,

    Width  : 40,
    Height : 16,

    Angle  : 0
};


/*************************************************/
/* SECTION 4 - FILE PATHS                        */
/*************************************************/

function GetDirectory(FilePath)
{
    const LastSlash = FilePath.lastIndexOf("/");

    if(LastSlash == -1)
        return "";

    return FilePath.substring(0, LastSlash + 1);
}


function CombinePath(BaseDirectory, FileName)
{
    if(
        FileName.startsWith("http://") ||
        FileName.startsWith("https://") ||
        FileName.startsWith("/")
    )
    {
        return FileName;
    }

    return BaseDirectory + FileName;
}


/*************************************************/
/* SECTION 5 - LOAD JSON                         */
/*************************************************/

async function LoadJSON(FileName)
{
    const Response = await fetch(FileName);

    if(!Response.ok)
    {
        throw new Error(
            "Kan bestand niet laden: " +
            FileName +
            " - HTTP " +
            Response.status
        );
    }

    return await Response.json();
}


/*************************************************/
/* SECTION 6 - LOAD IMAGE                        */
/*************************************************/

function LoadImage(FileName)
{
    return new Promise(function(Resolve, Reject)
    {
        const ImageFile = new Image();

        ImageFile.onload = function()
        {
            Resolve(ImageFile);
        };

        ImageFile.onerror = function()
        {
            Reject(
                new Error(
                    "Kan afbeelding niet laden: " +
                    FileName
                )
            );
        };

        ImageFile.src = FileName;
    });
}


/*************************************************/
/* SECTION 7 - LOAD TILESETS                     */
/*************************************************/

async function LoadTilesets(MapFileName)
{
    LoadedTilesets = [];

    const MapDirectory = GetDirectory(MapFileName);

    for(const MapTileset of MapData.tilesets)
    {
        let TilesetData;
        let TilesetDirectory;

        /*
            Externe tileset, bijvoorbeeld:

            "source": "Gameparts.tsj"
        */

        if(MapTileset.source)
        {
            const TilesetFileName =
                CombinePath(
                    MapDirectory,
                    MapTileset.source
                );

            TilesetData =
                await LoadJSON(TilesetFileName);

            TilesetDirectory =
                GetDirectory(TilesetFileName);
        }
        else
        {
            /*
                Tileset is direct in de TMJ opgeslagen.
            */

            TilesetData = MapTileset;
            TilesetDirectory = MapDirectory;
        }

        if(!TilesetData.image)
        {
            throw new Error(
                "Tileset heeft geen losse tileset-afbeelding."
            );
        }

        const ImageFileName =
            CombinePath(
                TilesetDirectory,
                TilesetData.image
            );

        const TilesetImage =
            await LoadImage(ImageFileName);

        LoadedTilesets.push(
        {
            FirstGID : MapTileset.firstgid,

            Data     : TilesetData,
            Image    : TilesetImage
        });
    }

    /*
        Hoogste FirstGID eerst.

        Daardoor kunnen we straks eenvoudig bepalen
        bij welke tileset een Global Tile ID hoort.
    */

    LoadedTilesets.sort(function(A, B)
    {
        return B.FirstGID - A.FirstGID;
    });
}


/*************************************************/
/* SECTION 8 - FIND MAP LAYERS                   */
/*************************************************/

function FindLayers()
{
    TrackLayer =
        MapData.layers.find(function(Layer)
        {
            return Layer.name == "Tracks" &&
                   Layer.type == "tilelayer";
        });

    TrainLayer =
        MapData.layers.find(function(Layer)
        {
            return Layer.name == "Train" &&
                   Layer.type == "objectgroup";
        });

    if(!TrackLayer)
    {
        throw new Error(
            'Tile Layer "Tracks" is niet gevonden.'
        );
    }

    if(!TrainLayer)
    {
        throw new Error(
            'Object Layer "Train" is niet gevonden.'
        );
    }
}


/*************************************************/
/* SECTION 9 - READ TRAIN OBJECT                 */
/*************************************************/

function ReadTrainObject()
{
    if(
        !TrainLayer.objects ||
        TrainLayer.objects.length == 0
    )
    {
        throw new Error(
            'Er staat geen object op de laag "Train".'
        );
    }

    /*
        Voor deze eerste versie gebruiken we
        gewoon het eerste object op de Train-laag.
    */

    const TrainObject = TrainLayer.objects[0];

    /*
        Bij een rechthoekobject zijn X en Y de
        linkerbovenhoek.

        De trein wordt vanuit zijn middelpunt getekend.
    */

    if(
        TrainObject.width > 0 &&
        TrainObject.height > 0
    )
    {
        Train.PixelX =
            TrainObject.x +
            TrainObject.width / 2;

        Train.PixelY =
            TrainObject.y +
            TrainObject.height / 2;
    }
    else
    {
        /*
            Dit werkt ook wanneer je per ongeluk
            een puntobject hebt gebruikt.
        */

        Train.PixelX = TrainObject.x;
        Train.PixelY = TrainObject.y;
    }

    /*
        Tiled bewaart rotatie in graden.

        Canvas gebruikt radialen.
    */

    Train.Angle =
        TrainObject.rotation *
        Math.PI / 180;

    console.log(
        "Treinpositie:",
        Train.PixelX,
        Train.PixelY
    );
}


/*************************************************/
/* SECTION 10 - TILESET LOOKUP                   */
/*************************************************/

function GetTilesetForGID(GlobalTileID)
{
    for(const Tileset of LoadedTilesets)
    {
        if(GlobalTileID >= Tileset.FirstGID)
            return Tileset;
    }

    return null;
}


/*************************************************/
/* SECTION 11 - HEXAGON TILE POSITION            */
/*************************************************/

function GetHexTilePosition(TileX, TileY)
{
    const TileWidth  = MapData.tilewidth;
    const TileHeight = MapData.tileheight;

    const HexSideLength =
        MapData.hexsidelength || 0;

    const StaggerAxis =
        MapData.staggeraxis || "x";

    const StaggerIndex =
        MapData.staggerindex || "odd";

    let PixelX = 0;
    let PixelY = 0;

    if(StaggerAxis == "x")
    {
        /*
            Verticale zijden van de hexagon.

            Kolommen overlappen gedeeltelijk.
        */

        const ColumnWidth =
            (TileWidth + HexSideLength) / 2;

        PixelX = TileX * ColumnWidth;
        PixelY = TileY * TileHeight;

        const IsStaggered =
            StaggerIndex == "odd"
                ? TileX % 2 == 1
                : TileX % 2 == 0;

        if(IsStaggered)
            PixelY += TileHeight / 2;
    }
    else
    {
        /*
            Horizontale zijden van de hexagon.

            Rijen overlappen gedeeltelijk.
        */

        const RowHeight =
            (TileHeight + HexSideLength) / 2;

        PixelX = TileX * TileWidth;
        PixelY = TileY * RowHeight;

        const IsStaggered =
            StaggerIndex == "odd"
                ? TileY % 2 == 1
                : TileY % 2 == 0;

        if(IsStaggered)
            PixelX += TileWidth / 2;
    }

    return {
        X : PixelX,
        Y : PixelY
    };
}


/*************************************************/
/* SECTION 12 - NORMAL TILE POSITION             */
/*************************************************/

function GetTilePosition(TileX, TileY)
{
    if(MapData.orientation == "hexagonal")
    {
        return GetHexTilePosition(
            TileX,
            TileY
        );
    }

    return {
        X : TileX * MapData.tilewidth,
        Y : TileY * MapData.tileheight
    };
}


/*************************************************/
/* SECTION 13 - DRAW ONE TILE                    */
/*************************************************/

function DrawTile(GlobalTileID, TileX, TileY)
{
    /*
        Tiled gebruikt de hoogste bits voor
        horizontaal, verticaal en diagonaal spiegelen.
    */

    const FLIPPED_HORIZONTALLY = 0x80000000;
    const FLIPPED_VERTICALLY   = 0x40000000;
    const FLIPPED_DIAGONALLY   = 0x20000000;
    const ROTATED_HEX_120      = 0x10000000;

    const FlipHorizontal =
        (GlobalTileID & FLIPPED_HORIZONTALLY) != 0;

    const FlipVertical =
        (GlobalTileID & FLIPPED_VERTICALLY) != 0;

    const FlipDiagonal =
        (GlobalTileID & FLIPPED_DIAGONALLY) != 0;

    const RotateHex120 =
        (GlobalTileID & ROTATED_HEX_120) != 0;

    GlobalTileID =
        GlobalTileID &
        ~(
            FLIPPED_HORIZONTALLY |
            FLIPPED_VERTICALLY   |
            FLIPPED_DIAGONALLY   |
            ROTATED_HEX_120
        );

    if(GlobalTileID == 0)
        return;

    const Tileset =
        GetTilesetForGID(GlobalTileID);

    if(!Tileset)
        return;

    const TilesetData = Tileset.Data;

    const LocalTileID =
        GlobalTileID - Tileset.FirstGID;

    const TileWidth =
        TilesetData.tilewidth;

    const TileHeight =
        TilesetData.tileheight;

    const Margin =
        TilesetData.margin || 0;

    const Spacing =
        TilesetData.spacing || 0;

    let Columns = TilesetData.columns;

    if(!Columns || Columns <= 0)
    {
        Columns = Math.floor(
            (
                Tileset.Image.width -
                Margin * 2 +
                Spacing
            ) /
            (
                TileWidth +
                Spacing
            )
        );
    }

    const SourceX =
        Margin +
        (LocalTileID % Columns) *
        (TileWidth + Spacing);

    const SourceY =
        Margin +
        Math.floor(LocalTileID / Columns) *
        (TileHeight + Spacing);

    const TilePosition =
        GetTilePosition(TileX, TileY);

    const DestinationX = TilePosition.X;
    const DestinationY = TilePosition.Y;

    /*
        Zonder flip of rotatie kan de tegel
        direct worden getekend.
    */

    if(
        !FlipHorizontal &&
        !FlipVertical &&
        !FlipDiagonal &&
        !RotateHex120
    )
    {
        Ctx.drawImage(
            Tileset.Image,

            SourceX,
            SourceY,
            TileWidth,
            TileHeight,

            DestinationX,
            DestinationY,
            TileWidth,
            TileHeight
        );

        return;
    }

    /*
        Ondersteuning voor gedraaide of gespiegelde
        tegels uit Tiled.
    */

    Ctx.save();

    Ctx.translate(
        DestinationX + TileWidth / 2,
        DestinationY + TileHeight / 2
    );

    if(RotateHex120)
        Ctx.rotate(2 * Math.PI / 3);

    if(FlipDiagonal)
        Ctx.rotate(Math.PI / 2);

    Ctx.scale(
        FlipHorizontal ? -1 : 1,
        FlipVertical   ? -1 : 1
    );

    Ctx.drawImage(
        Tileset.Image,

        SourceX,
        SourceY,
        TileWidth,
        TileHeight,

        -TileWidth / 2,
        -TileHeight / 2,
        TileWidth,
        TileHeight
    );

    Ctx.restore();
}


/*************************************************/
/* SECTION 14 - DRAW TRACKS LAYER                 */
/*************************************************/

function DrawTrack()
{
    const LayerWidth =
        TrackLayer.width;

    const LayerHeight =
        TrackLayer.height;

    for(let TileY = 0; TileY < LayerHeight; TileY++)
    {
        for(let TileX = 0; TileX < LayerWidth; TileX++)
        {
            const ArrayPosition =
                TileY * LayerWidth + TileX;

            const GlobalTileID =
                TrackLayer.data[ArrayPosition];

            DrawTile(
                GlobalTileID,
                TileX,
                TileY
            );
        }
    }
}


/*************************************************/
/* SECTION 15 - DRAW TRAIN                       */
/*************************************************/

function DrawTrain()
{
    Ctx.save();

    Ctx.translate(
        Train.PixelX,
        Train.PixelY
    );

    Ctx.rotate(Train.Angle);

    /*
        Rode treinbak.
    */

    Ctx.fillStyle = "red";

    Ctx.fillRect(
        -Train.Width / 2,
        -Train.Height / 2,
        Train.Width,
        Train.Height
    );

    /*
        Gele voorkant.

        Daardoor is zichtbaar welke kant
        de trein op kijkt.
    */

    Ctx.fillStyle = "yellow";

    Ctx.fillRect(
        Train.Width / 2 - 7,
        -Train.Height / 2,
        7,
        Train.Height
    );

    Ctx.restore();
}


/*************************************************/
/* SECTION 16 - DRAW GAME                        */
/*************************************************/

function DrawGame()
{
    Ctx.clearRect(
        0,
        0,
        Canvas.width,
        Canvas.height
    );

    DrawTrack();
    DrawTrain();
}


/*************************************************/
/* SECTION 17 - INITIALIZE GAME                  */
/*************************************************/

async function InitGame()
{
    try
    {
        console.log(
            "Train Puzzle " + VERSION
        );

        const MapFileName = "test.tmj";

        MapData =
            await LoadJSON(MapFileName);

        await LoadTilesets(MapFileName);

        FindLayers();
        ReadTrainObject();

        DrawGame();

        console.log(
            "Kaart en trein zijn geladen."
        );
    }
    catch(Error)
    {
        console.error(Error);

        Ctx.clearRect(
            0,
            0,
            Canvas.width,
            Canvas.height
        );

        Ctx.fillStyle = "white";
        Ctx.font = "20px Arial";

        Ctx.fillText(
            "Fout bij het laden van de treinpuzzel.",
            20,
            40
        );

        Ctx.font = "15px Arial";

        Ctx.fillText(
            Error.message,
            20,
            70
        );
    }
}


/*************************************************/
/* SECTION 18 - START GAME                       */
/*************************************************/

InitGame();