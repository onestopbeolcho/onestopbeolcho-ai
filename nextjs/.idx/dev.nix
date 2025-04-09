# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  channel = "stable-24.05"; # or "unstable"
  packages = [
    pkgs.python311  # Python 3.11로 변경
    pkgs.python311Packages.openai
    pkgs.python311Packages.python-dotenv
    pkgs.devbox
  ];
  env = {};
  idx = {
    extensions = [];
    previews = {
      enable = true;
      previews = {};
    };
    workspace = {
      onCreate = {};
      onStart = {};
    };
  };
}