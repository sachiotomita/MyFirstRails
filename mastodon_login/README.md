# Mastodonログイン サンプル
## 概要

Railsにこれから初めて触れる方を対象にしたチュートリアルです

RailsにMastodonでのログイン機能を実装するチュートリアルになります

## チュートリアル
### アプリのひな型を作る

まず、`rails new`を実行し、アプリのひな型を作成します

```shell
rails new mastodon_login
```

次に、作成したアプリのディレクトリへと移動します

```shell
cd mastodon_login
```

### Deviseの導入

Twitterでのログイン機能を実装するにあたって、Deviseを使用します
まず、`Gemfile`に`gem 'devise'`を追加して`bundle install`を実行します

```ruby:Gemfile
gem 'devise'
```

```shell
bundle install
```

この時、`sqlite3`がインストールできないエラーが発生するかもしれません
その場合は以下のように`sqlite3`のバージョンを修正して`bundle install`を実行してください

```ruby:Gemfile
gem 'sqlite3', '1.3.13'
```

```shell
bundle install
```

`bundle install`後、以下のコマンドを実行して`Devise`をインストールします

```shell
rails g devise:install
```

次に、`Devise`で使用する`View`ファイルを作成します

```shell
rails g devise:views
```

そして、`Devise`で使用する`Model`を作成し、マイグレーションを実行します

```shell
rails g devise user
rails db:migrate
```

これで`Devise`の導入は完了です！

### Mastodonにアプリを作成

Mastodonでのログインを実装するためには、Mastodonへアプリケーションの登録が必要になります

自分のアカウントがあるMastoonインスタンスにて`ユーザー設定`をクリックし、`開発`という項目をクリックします。
`新規アプリ`をクリックし、`アプリ名`を入力の上`送信`をクリックします。

その後、作成したアプリをクリックすると`クライアントキー`と`シークレットキー`を取得できます。
この二つは後々で使いますのでわかるようにメモしておきます(ただし、第三者とは絶対に共有しないでください！)

### Dotenvの導入

Mastodonから取得した`クライアントキー`と`シークレットキー`をソースコードにそのまま貼り付けてしまうと悪意のある第三者に利用されてしまう可能性があります
実際に、発生した事例としては以下のようなものがあります

[AWSが不正利用され300万円の請求が届いてから免除までの一部始終](https://qiita.com/AkiyoshiOkano/items/72002409e3be9215ae7e)

[Peing脆弱性案件に見る初動のまずさ](https://www.orangeitems.com/entry/2019/01/29/014328)

こういったことを回避するためにも`Dotenv`などを使用してソースコードに直接書かないようにする必要があります

まず、`Gemfile`に`gem 'dotenv-rails'`を追加します

```ruby:Gemfile
gem 'dotenv-rails'
```

その後、`bundle install`を実行します

```shell
bundle install
```

そして、先ほど取得したキーなどを`.env`に書き込みます
`.env`は`Gemfile`と同じ位置に作成します

```:.env
# Using Mastodon API
MASTODON_CLIENT_KEY=`クライアントキー`
MASTODON_SECRET_KEY=`シークレットキー`
```

最後に、`.gitignore`を編集し、`.env`を`Git`の管理対象から外します

```:.gitignore
# See https://help.github.com/articles/ignoring-files for more about ignoring files.
#
# If you find yourself ignoring temporary files generated by your text editor
# or operating system, you probably want to add a global ignore instead:
#   git config --global core.excludesfile '~/.gitignore_global'

# Ignore bundler config.
/.bundle

# Ignore the default SQLite database.
/db/*.sqlite3
/db/*.sqlite3-journal

# Ignore all logfiles and tempfiles.
/log/*
/tmp/*
!/log/.keep
!/tmp/.keep

# Ignore uploaded files in development
/storage/*
!/storage/.keep

/node_modules
/yarn-error.log

/public/assets
.byebug_history

# Ignore master key for decrypting credentials and more.
/config/master.key
.env
```

これで`Dotenv`の導入は完了です！

### Mastodonログインの実装

Mastodonアカウントでのログイン機能は[`Oauth`](https://ja.wikipedia.org/wiki/OAuth)という認証を使用します

まず、必要な`gem`を`Gemfile`に追加します

```ruby:Gemfile
gem 'omniauth'
gem 'omniauth-mastodon'
gem 'mastodon-api', require: 'mastodon'
```

`bundle install`で`gem`をインストールします

```shell
bundle install
```

`User`モデルにカラムを追加してマイグレーションを行います

```shell
rails g migration AddColumnsToUsers uid:string provider:string
rails db:migrate
```

次に、Mastodonのドメイン情報などを記憶するモデル`MastodonClient`を以下のコマンドで作成します。

```
rails generate model MastodonClient domain:string client_id:string client_secret:string 
```

`config/initializers/devise.rb`を編集して`Devise`側の設定を変更します

```ruby:config/initializers/devise.rb
Devise.setup do |config|

  #<省略>

  # ==> OmniAuth
  # Add a new OmniAuth provider. Check the wiki for more information on setting
  # up on your models and hooks.
  # config.omniauth :github, 'APP_ID', 'APP_SECRET', scope: 'user,public_repo'

  config.omniauth :mastodon, ENV['MASTODON_CLIENT_KEY'], ENV['MASTODON_SECRET_KEY']

  config.omniauth :mastodon, scope: 'read follow', credentials: lambda { |domain, callback_url|
    client = MastodonClient.where(domain: domain).first_or_initialize(domain: domain)

    return [client.client_id, client.client_secret] unless client.new_record?

    new_client = Mastodon::REST::Client.new(base_url: "https://#{domain}").create_app('MastodonLoginSample', callback_url, 'read follow')

    client.client_id = new_client.client_id
    client.client_secret = new_client.client_secret
    client.save

    [client.client_id, client.client_secret]
  }

　#<以下省略>
end
```

`Dotenv`経由でMastodonのクライアントキーなどを読み取っています


その後、`User`モデルに`:omniauthable`を追加します

```ruby:user.rb
class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :omniauthable
end
```

その後、`self.find_for_oauth(auth)`というメソッドを追加します

```ruby:user.rb
class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :omniauthable

  def self.find_for_oauth(auth)
    user = User.where(uid: auth.uid, provider: auth.provider).first

    unless user
      user = User.create(
        uid:      auth.uid,
        provider: auth.provider,
        email:    User.dummy_email(auth),
        password: Devise.friendly_token[0, 20]
      )
      user.save!
    end
    current_user = user
  end

  private

    def self.dummy_email(auth)
      "#{auth.uid}"
    end
end
```

このメソッドにより、アカウントが既に作成されているかをチェックし、アカウントがない場合は新しく作成することができるようになります


`app/controllers/users/omniauth_callbacks_controller.rb`というコールバック処理を行うコントローラーを作成します

```ruby:app/controllers/users/omniauth_callbacks_controller.rb
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def mastodon
    callback_from :mastodon
  end

  private

  def callback_from(provider)
    provider = provider.to_s

    @user = User.find_for_oauth(request.env['omniauth.auth'])

    if @user.persisted?
      flash[:notice] = I18n.t('devise.omniauth_callbacks.success', kind: provider.capitalize)
      sign_in_and_redirect @user, event: :authentication
    else
      session["devise.#{provider}_data"] = request.env['omniauth.auth']
      redirect_to new_user_registration_url
    end
  end
end
```

最後に、`config/routes.rb`にコールバック先のルーティングを追加します

```ruby:config/routes.rb
Rails.application.routes.draw do
  devise_for :users, controllers: { omniauth_callbacks: 'users/omniauth_callbacks' }
end
```

これでTwitterでのログイン機能は実装できました！

### 静的なページの作成

最後に、Mastodonログインが実際に機能しているかどうかを確認するためのページを作成します

```shell
rails g controller web index
```

`app/views/web/index.html.erb`にTwitterログインのリンクなどを追加します

```erb:app/views/web/index.html.erb
<h1>Web#index</h1>
<p>Find me in app/views/web/index.html.erb</p>

<%= link_to 'Mastodon Login', user_mastodon_omniauth_authorize_path %>

<% if user_signed_in? %>
    Your Welcome!
<% end %>
```

また、`config/routes.rb`を以下のように編集します

```ruby:config/routes.rb
Rails.application.routes.draw do
  root 'web#index'
  devise_for :users, controllers: { omniauth_callbacks: 'users/omniauth_callbacks' }
end
```

`Mastodon Login`をクリックしてログインできるようになっています
また、ログインすると`Your Welcome!`の文字が画面に表示されるようになっています

### 実際にログインしてみよう

`rails s`でローカルサーバを起動し、`localhost:3000`にアクセスします

その後、`Mastodon Login`のリンクをクリックするとMastodonのアプリ認証の画面が表示されます

認証後、`localhost:3000`に`Your Welcome!`と表示されていればOKです！